/**
 * ai-sentiment-worker — classifies the sentiment of inbound messages.
 *
 * Consumes `message.received` events (parallel to ai-response-worker).
 * Uses a provider-agnostic generateText + strict JSON contract (validated by a
 * Zod schema) so the result is always typed — e o classificador roda também em
 * provedores que não expõem `generateObject`/saída estruturada (DeepSeek).
 *
 * ## Por que não `generateObject`
 *
 * O `generateObject` do AI SDK depende de o provider suportar saída estruturada
 * (json_schema no OpenAI-compat, tool_use no Anthropic). O DeepSeek — o provider
 * desta instalação — responde 200 com texto corrido e o SDK devolve
 * "No object generated: the model did not return a response." Medido em
 * produção (2026-09-09): binding sentiment_classify→deepseek ativo, a chamada
 * chegava ao provider e o object nunca vinha. Aqui o texto é gerado por
 * `generateText` (que o DeepSeek executa — é o mesmo caminho do seam do agente)
 * e o JSON é extraído e validado pelo schema. Mesmo contrato de saída, sem
 * depender do modo estruturado do provider.
 *
 * Design principles (CLAUDE.md):
 * - Service-role admin client bypasses RLS → EVERY query filters `organization_id`
 *   programmatically from the trusted event_log row, never from user input.
 * - Any failure is swallowed (try/catch global) so the bot path in
 *   ai-response-worker keeps running unaffected.
 * - `console.log` is forbidden — only `console.warn`/`console.error` with prefix.
 */

import { generateText } from "ai";
import { z } from "zod";

import { resolverAgenteDaConversa } from "@/lib/ai/agents/agente-da-conversa";
import { computeCost } from "@/lib/ai/cost";
import { decidirElegibilidadeDaConversaViaSupabase } from "@/lib/ai/elegibilidade/consulta-supabase";
import { ttlDaAutorizacaoMs } from "@/lib/ai/elegibilidade/gate";
import { DEFAULT_CLASSIFIER_MODEL } from "@/lib/ai/gateway";
import { resolverModeloDoPonto } from "@/lib/ai/gateway-binding";
import { logInvocation } from "@/lib/ai/log-invocation";
import { SENTIMENT_SYSTEM_PROMPT } from "@/lib/ai/prompts/sentiment";
import type { EventRow } from "@/lib/event-log/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";

const SENTIMENT_MODEL = DEFAULT_CLASSIFIER_MODEL; // "anthropic/claude-haiku-4-5"
const DEFAULT_SENTIMENT_THRESHOLD = 0.3;
const CLASSIFY_TIMEOUT_MS = 5_000;

// As descrições NÃO são decoração: viram o JSON Schema da ferramenta que o
// provider manda ao modelo. Sem elas o `.max(100)` existia só no validador — o
// modelo nunca ficava sabendo do limite e escrevia 223, 297, 340 caracteres
// (medido com mensagens reais desta instalação). Com a descrição, o mesmo
// conjunto caiu para 59–102.
//
// O teto do Zod é FOLGADO de propósito. Modelo não conta caractere: mesmo
// avisado, uma amostra bateu 102. Reprovar a classificação inteira por 2
// caracteres a mais seria péssimo negócio — ainda mais porque
// `reasoning_short` é DESCARTADO (só `sentiment_score` e a latência vão para
// messages.metadata). Ele existe para o modelo raciocinar antes de pontuar,
// não para ser guardado. A descrição segura a verbosidade (e o custo); o teto
// só impede resposta absurda.
const sentimentSchema = z.object({
  sentiment_score: z
    .number()
    .min(0)
    .max(1)
    .describe("0 = muito negativo, 0.5 = neutro, 1 = muito positivo"),
  reasoning_short: z
    .string()
    .max(280)
    .describe("Justificativa curta da nota, em NO MÁXIMO 100 caracteres"),
});

/**
 * Extrai e valida o JSON do texto do modelo. Tolerante a cercas markdown e a
 * texto antes/depois do objeto — modelo não é parser. Devolve o objeto já
 * validado pelo schema; lança com mensagem curta (vira finish_reason='error').
 */
function validarSentimentoDoTexto(texto: string): z.infer<typeof sentimentSchema> {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim < inicio) {
    throw new Error("No object generated: resposta sem objeto JSON.");
  }
  const cru: unknown = JSON.parse(texto.slice(inicio, fim + 1));
  const parsed = sentimentSchema.safeParse(cru);
  if (!parsed.success) {
    throw new Error(
      `No object generated: resposta não casou o schema (${parsed.error.issues.length} problema(s)).`,
    );
  }
  return parsed.data;
}

export interface SentimentResult {
  skipped: boolean;
  reason?: string;
  sentiment_score?: number;
}

export async function processSentiment(event: EventRow): Promise<SentimentResult> {
  try {
    // SEM guard `isAiGatewayConfigured()` aqui. Aquele teste só olhava as chaves
    // do .env — e uma instalação que roda 100% por credencial/binding da
    // organização (DeepSeek cadastrado pela tela) não tem chave de env, então o
    // guard matava o ponto ANTES de consultar o resolvedor (medido: drain
    // devolvia ai_gateway_key_missing com binding ativo). A autoridade é o
    // resolvedor abaixo: binding do painel → credencial da organização → chave
    // da instalação. Ele devolve null quando nada existe, e o skip é decidido lá.

    // Passar SENTIMENT_MODEL como string cai no gateway da Vercel mesmo sem
    // chave (plano anônimo) e devolve "Unauthenticated ... Configure
    // AI_GATEWAY_API_KEY" — o que quebrava este worker em toda instalação que
    // só tem ANTHROPIC_API_KEY, ou seja, o padrão do install.sh. O resolver
    // devolve o provider certo para a chave que existir.
    // O painel de provedores manda AQUI também. Sem esta linha, a tela
    // oferecia "Medir o clima da conversa", aceitava a escolha e dizia
    // "salvo" — e este worker seguia usando o modelo padrão. Botão que não
    // controla nada é pior que botão ausente: gasta a confiança de quem clicou.
    const resolvido = await resolverModeloDoPonto(
      "sentiment_classify",
      event.organization_id,
      SENTIMENT_MODEL,
    );
    if (!resolvido) {
      return { skipped: true, reason: "ai_gateway_key_missing" };
    }
    const sentimentModel = resolvido.model;

    const messageId =
      (event.payload?.["message_id"] as string | undefined) ?? event.entity_id ?? null;
    const conversationId = (event.payload?.["conversation_id"] as string | undefined) ?? null;
    if (!messageId) {
      return { skipped: true, reason: "missing_message_id" };
    }

    const admin = createAdminClient();

    // ── Load message (programmatic org filter) ────────────────────────────
    const { data: message, error: msgErr } = await admin
      .from("messages")
      .select("id, body, direction, conversation_id, organization_id, metadata")
      .eq("id", messageId)
      .eq("organization_id", event.organization_id)
      .maybeSingle();

    if (msgErr || !message) {
      return { skipped: true, reason: "message_not_found" };
    }

    // ── Guard: inbound only ───────────────────────────────────────────────
    if (message.direction !== "inbound") {
      return { skipped: true, reason: "not_inbound" };
    }

    // ── Guard: non-empty body ─────────────────────────────────────────────
    const body = (message.body ?? "").trim();
    if (!body) {
      return { skipped: true, reason: "empty_body" };
    }

    // ── Guard: elegibilidade da IA ────────────────────────────────────────
    // O único efeito deste worker é alimentar o handoff por sentimento
    // (`ai.sentiment_alert` → `triggerHandoff`). Numa conversa que o gate
    // `allowlist` barra, `triggerHandoff` já se recusa — então classificar aqui
    // seria só queimar um Haiku à toa. Pula cedo. `open` (o default) segue.
    // Fail-closed: erro de leitura → pula (sem custo, sem efeito).
    const convIdParaGate = conversationId ?? (message.conversation_id as string | null);
    if (convIdParaGate) {
      try {
        const elegib = await decidirElegibilidadeDaConversaViaSupabase(admin, {
          organizationId: event.organization_id,
          conversationId: convIdParaGate,
          agora: new Date(),
          ttlMs: ttlDaAutorizacaoMs(process.env),
        });
        if (elegib !== null && elegib.bloqueioPorAllowlist) {
          return { skipped: true, reason: "nao_elegivel_para_ia" };
        }
      } catch {
        return { skipped: true, reason: "elegibilidade_indeterminada" };
      }
    }

    // ── Qual agente atende ESTA conversa? ─────────────────────────────────
    //
    // Antes, a resposta era "o primeiro da organização que atende", ordenado por
    // `is_default` e depois `created_at` — e a conversa que disparou o evento não
    // entrava na consulta em lugar nenhum. Com um agente só, certo por acidente.
    // Com dois, o limiar em vigor passava a depender da ORDEM DE CRIAÇÃO: numa
    // clínica, cliente triste é sinal de problema; numa assistência técnica, é o
    // cliente normal. O mesmo limiar erra nos dois sentidos, e quem configurou o
    // campo do agente B ficava vendo o comportamento do agente A sem pista
    // nenhuma na tela — os dois campos existem, os dois aceitam valor, e um
    // deles não fazia nada. (issue #486)
    const { data: conversa } = await admin
      .from("conversations")
      .select("id, channel_session_id, active_ai_agent_id")
      .eq("id", message.conversation_id)
      .eq("organization_id", event.organization_id)
      .maybeSingle();

    // As versões PUBLICADAS ligadas ao número em que a conversa acontece — é
    // quem de fato responde ao cliente por aquela sessão. `null` (não consegui
    // consultar) e `[]` (consultei, não há) levam ao mesmo desfecho na régua,
    // mas quem lê o log precisa distinguir os dois.
    let versoesPublicadasNaSessao: string[] | null = null;
    if (conversa?.channel_session_id) {
      const { data: versoes } = await admin
        .from("ai_agent_versions")
        .select("id, channel_session_id, status")
        .eq("organization_id", event.organization_id)
        .eq("channel_session_id", conversa.channel_session_id)
        .eq("status", "published");
      versoesPublicadasNaSessao = (versoes ?? []).map((v) => v.id as string);
    }

    const { data: candidatos } = await admin
      .from("ai_agents")
      .select(
        "id, config, kind, is_active, paused_at, published_version_id, archived_at, priority, created_at",
      )
      .eq("organization_id", event.organization_id)
      .is("archived_at", null);

    const { agente: agent, motivo: motivoDoAgente } = resolverAgenteDaConversa(
      candidatos ?? [],
      conversa
        ? {
            active_ai_agent_id: conversa.active_ai_agent_id as string | null,
            versoesPublicadasNaSessao,
          }
        : null,
    );

    // Sem agente resolvido, o padrão do PRODUTO — nunca o limiar do vizinho.
    // Chutar a configuração de outro agente é o defeito de novo, agora com cara
    // de configuração deliberada.
    const agentConfig = (agent?.config as Record<string, unknown> | null) ?? {};
    const threshold =
      typeof agentConfig["sentiment_threshold"] === "number"
        ? agentConfig["sentiment_threshold"]
        : DEFAULT_SENTIMENT_THRESHOLD;

    // ── Call LLM ──────────────────────────────────────────────────────────
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), CLASSIFY_TIMEOUT_MS);

    const start = Date.now();
    let result: z.infer<typeof sentimentSchema>;
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      // `generateText` + JSON estrito em vez de `generateObject`: o DeepSeek
      // não devolve saída estruturada (json_schema/tool_use) e o generateObject
      // morria com "No object generated" (ver cabeçalho). Texto cru o DeepSeek
      // gera — mesmo caminho do seam do agente. 256 tokens seguram o custo; o
      // JSON de um score + justificativa curta cabe folgado (pico medido: 146).
      const generated = await generateText({
        model: sentimentModel,
        system: SENTIMENT_SYSTEM_PROMPT,
        prompt: body,
        temperature: 0,
        maxOutputTokens: 256,
        abortSignal: abortController.signal,
      });

      result = validarSentimentoDoTexto(generated.text);

      const usage = generated.usage as
        | {
            inputTokens?: number;
            outputTokens?: number;
            promptTokens?: number;
            completionTokens?: number;
          }
        | undefined;
      promptTokens = usage?.inputTokens ?? usage?.promptTokens ?? 0;
      completionTokens = usage?.outputTokens ?? usage?.completionTokens ?? 0;
    } catch (err) {
      // A FALHA também vira linha em `llm_calls`. A 0128 fez isso para o seam do
      // agent-engine, e este worker não passa por lá — então, até aqui, escolher
      // no painel um modelo que não existe fazia toda classificação falhar sem
      // deixar rastro nenhum: a tela de Execuções, cuja razão de existir é
      // responder "por que falhou", não mostrava nada para este ponto, com o
      // painel dizendo que estava configurado.
      //
      // O `throw` mantém o desfecho de antes — quem decide o retorno continua
      // sendo o catch global, que nunca deixa este worker derrubar o bot.
      logInvocation({
        organization_id: event.organization_id,
        agent_id: agent?.id ?? null,
        conversation_id: conversationId ?? message.conversation_id ?? null,
        message_id: messageId,
        invocation_kind: "sentiment_classify",
        model: resolvido.modelId,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        latency_ms: Date.now() - start,
        cost_cents: 0,
        finish_reason: "error",
        error_payload: { message: err instanceof Error ? err.message : String(err) },
      });
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    const latencyMs = Date.now() - start;

    // ── Merge sentiment into messages.metadata ────────────────────────────
    const existingMetadata = (message.metadata as Record<string, unknown> | null) ?? {};
    const updatedMetadata = {
      ...existingMetadata,
      sentiment_score: result.sentiment_score,
      sentiment_latency_ms: latencyMs,
    };

    const { error: updateErr } = await admin
      .from("messages")
      .update({ metadata: updatedMetadata })
      .eq("id", messageId)
      .eq("organization_id", event.organization_id);

    if (updateErr) {
      console.warn("[ai-sentiment-worker] metadata update failed", {
        message_id: messageId,
        error: updateErr.message,
      });
    }

    // ── Log invocation (fire-and-forget) ──────────────────────────────────
    logInvocation({
      organization_id: event.organization_id,
      // `null`, não `""` (issue #160): o worker roda mesmo sem agente ativo — lê
      // o agente só para o threshold e cai no default —, e string vazia numa
      // coluna uuid fazia o insert de auditoria falhar em silêncio. O custo
      // existe; a linha precisa entrar.
      agent_id: agent?.id ?? null,
      conversation_id: conversationId ?? message.conversation_id ?? null,
      message_id: messageId,
      invocation_kind: "sentiment_classify",
      model: resolvido.modelId,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      latency_ms: latencyMs,
      cost_cents: await computeCost({
        model: resolvido.modelId,
        promptTokens,
        completionTokens,
      }),
      finish_reason: null,
    });

    // ── Emit alert if below threshold ────────────────────────────────────
    if (result.sentiment_score < threshold) {
      const { error: emitErr } = await admin.rpc(
        "emit_event" as never,
        {
          p_event_type: "ai.sentiment_alert",
          p_entity_kind: "message",
          p_entity_id: messageId,
          p_payload: {
            message_id: messageId,
            conversation_id: conversationId ?? message.conversation_id ?? null,
            sentiment_score: result.sentiment_score,
          },
          // `agent_id` e `motivo` viajam com o alerta porque o limiar é o número
          // que decidiu emiti-lo: sem eles, "por que este alerta saiu?" recomeça
          // do zero, e foi essa ausência que deixou o defeito da #486 invisível
          // pela tela — os dois campos existiam e um não fazia nada.
          p_metadata: {
            source: "ai-sentiment-worker",
            threshold,
            agent_id: agent?.id ?? null,
            agente_resolvido_por: motivoDoAgente,
          },
          p_organization_id: event.organization_id,
        } as never,
      );

      if (emitErr) {
        console.warn("[ai-sentiment-worker] ai.sentiment_alert emit failed", {
          message_id: messageId,
          error: emitErr.message,
        });
      }
    }

    return { skipped: false, sentiment_score: result.sentiment_score };
  } catch (err) {
    // Global catch: NEVER throw — must not break the bot path.
    console.warn("[ai-sentiment-worker] sentiment_classify_failed", {
      event_id: event.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return { skipped: true, reason: "classify_failed" };
  }
}
