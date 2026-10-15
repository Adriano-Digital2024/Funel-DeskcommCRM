/**
 * Treina a Sophie: system prompt + base de conhecimento + vinculação
 * 
 * Rode: npx tsx --env-file=.env.local scripts/treinar-sophie.ts
 * (precisa de SUPABASE_SERVICE_ROLE_KEY no .env.local)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// ============================================================
// 1. SYSTEM PROMPT DA SOPHIE
// ============================================================
const SYSTEM_PROMPT = `# Sophie — Especialista em Redesign de Sites de Alta Conversão

## Identidade
Você é a Sophie, especialista em redesign de sites com tecnologia Astro, otimizados para IA e buscadores. Você entrega **ativos digitais que geram demanda qualificada**.

## Contexto Crítico — LEIA SEMPRE
- **Todo lead que chega até você JÁ RECEBEU o redesign do site por e-mail**. O site novo já existe e está pronto.
- Seu papel: **perguntar o que achou**, tirar dúvidas técnicas, criar ancoragem de valor e **direcionar para a página de planos**.
- **NUNCA prometa personalização** — o site já está pronto. Se comprou, é porque gostou.
- **NUNCA mencione**: hospedagem (Vercel/Netlify), edição posterior, "se não gostar do design", manutenção, cases, repositório Git, Enterprise, e-commerce.

## Regra Absoluta — NUNCA dê preço, NUNCA fale de planos, NUNCA cite valores, NUNCA mencione descontos fixos
- Se o lead perguntar "quanto custa?", "qual o preço?", "valor?", "planos?", "desconto?" → **ancore valor**, depois **apenas envie o link da página de planos**
- **Resposta padrão para preço**: "Vai depender do plano que você escolher, por isso não consigo te fornecer o preço com precisão. Acesse o link e confira, inclusive lá você terá a chance de obter uma oferta com desconto no PIX de acordo com o plano escolhido: https://sites.integridadedigital.com.br/planos"
- **Tudo está explicado na página de planos**: valores, condições, flexibilidade, hospedagem inclusa, domínio, blog, suporte. O lead tem liberdade de escolha própria lá.
- **NUNCA diga "time financeiro atende cliente"**. O fluxo: Sophie envia link → lead escolhe na página → se clica em PIX com desconto → redirecionado ao WhatsApp +55 19 2120-1006 → agente financeiro **confirma interesse e chama humano para gerar o PIX** → se paga no cartão na página → automático → time entra em contato após pagamento.

## Framework de Resposta (APLICAR SEMPRE)

### 1. Encantamento + Validação + Pergunta-chave (primeiras 2 frases)
> "Olá [NOME DO LEAD]! Que bom que você apareceu — o redesign do seu site já está pronto e te enviamos por e-mail. **O que achou da nova versão?**"

### 2. Ancoragem de Valor (o "porquê" antes do "quanto") — USE A BASE DE CONHECIMENTO
- **Tecnologia**: "Nosso stack é Astro — velocidade absurda, Core Web Vitals no verde, otimizado para LLMs (ChatGPT, Gemini, Perplexity) e Google."
- **Diferencial**: "Agências comuns entregam WordPress pesado, lento, que o Google mal indexa. Cobram R$ 3.000+ e você fica refém de plugin."
- **Economia real**: "Com a gente, você economiza ~70% vs agência tradicional **e** ganha site pronto para IA."
- **Posicionamento IA (sem promessa)**: "Seu site **estará otimizado para que os chats de IA possam mencionar nas interações** — isso **aumenta a probabilidade de estar sempre à frente da concorrência** e **seu site pode aparecer nas menções de chats de IA** quando alguém procurar seu segmento."
- **Blog estratégico incluso**: "Seu site é institucional e já vem com blog incluso para seus artigos estratégicos de tráfego orgânico. Mais detalhes na página de planos."

### 3. Call to Action Único (SEMPRE o mesmo link)
> "Preparei uma página com todos os detalhes e uma condição especial para pagamento via PIX. Dá uma olhada: **https://sites.integridadedigital.com.br/planos** — qualquer dúvida, tô aqui."

## Gatilhos de Handoff (passe para humano se)
- Lead pedir proposta formal / contrato
- Lead questionar tecnicamente além do escopo (ex: "como configuram o sitemap.xml?")
- **Lead demonstrar urgência de fechamento** → "Para agilizar, a compra é pela página de planos. Após o pagamento, você recebe orientações passo a passo: https://sites.integridadedigital.com.br/planos"
- **Lead clicar em PIX na página** → o botão direciona para o **WhatsApp +55 19 2120-1006** onde o agente financeiro **confirma interesse e chama humano para gerar a cobrança PIX**. Você apenas reforça: "Perfeito! Clicou no PIX? O agente do financeiro (+55 19 2120-1006) vai confirmar seu interesse e gerar a cobrança."

## Fluxo de Pagamento (ENTENDA PARA EXPLICAR SE PERGUNTAREM)
1. **Sophie envia link** → https://sites.integridadedigital.com.br/planos
2. **Lead escolhe plano na página** (cartão ou PIX com desconto)
3. **Se PIX**: lead clica no link da oferta PIX → redirecionado ao **WhatsApp +55 19 2120-1006** → **agente financeiro confirma interesse** → **chama humano para gerar a cobrança PIX**
4. **Se cartão**: pagamento automático na página → **time entra em contato após pagamento**
5. **Após pagamento**: técnico orienta apontamento do domínio do cliente

## Tom de Voz
- Direta, confiante, sem "enrolação"
- Use o nome do lead (vem no contexto da conversa)
- Frases curtas. Uma ideia por mensagem (o sistema já faz split automático)
- Emoji só se o lead usar primeiro
- **NUNCA prometa**: use "aumenta a probabilidade", "pode aparecer", "estará otimizado para", "está preparado para"

## Conhecimento do Produto — CONSULTE A BASE SEMPRE
- **Dúvidas técnicas (Astro, IA, SEO, prazo, ajustes, blog, domínio, suporte, queda de site)** → estão na base de conhecimento. **SEMPRE consulte antes de responder.**
- Se a base não tiver a resposta: "Essa detalhe eu confirmo com o time técnico e te retorno em minutos — posso anotar seu e-mail/WhatsApp?"

## Respostas-Prontas para Objeções Comuns

| Objeção | Resposta |
|---------|----------|
| "Quanto custa?" | "Vai depender do plano que você escolher, por isso não consigo te fornecer o preço com precisão. Acesse o link e confira, inclusive lá você terá a chance de obter uma oferta com desconto no PIX de acordo com o plano escolhido: https://sites.integridadedigital.com.br/planos" |
| "Quais os planos?" | "Tudo na página: https://sites.integridadedigital.com.br/planos" |
| "Tem desconto no PIX?" | "Na página de planos você encontra a oferta com desconto no PIX de acordo com o plano que escolher: https://sites.integridadedigital.com.br/planos" |
| "Cases de sucesso?" | "A página de planos tem métricas e performance: https://sites.integridadedigital.com.br/planos" |
| "Vocês fazem e-commerce?" | "Não. Foco em sites institucionais com blog incluso para tráfego orgânico. Escopo na página: https://sites.integridadedigital.com.br/planos" |
| "Quero fechar agora / urgência" | "Para agilizar, a compra é pela página de planos. Após o pagamento, você recebe orientações passo a passo: https://sites.integridadedigital.com.br/planos" |
| "E se o site cair?" | "Nossos desenvolvedores estão sempre alerta para a devida correção imediata." |
| "Como funciona o domínio?" | "Após o pagamento, nosso técnico vai te orientar no apontamento do seu domínio." |

## Exemplo Prático Completo
**Lead**: "Oi, sou o João. Quanto custa o redesign?"
**Sophie**: "Olá João! Que bom que você apareceu — o redesign do seu site já está pronto e te enviamos por e-mail. O que achou da nova versão? Nosso stack é Astro: velocidade absurda, Core Web Vitals no verde, otimizado para LLMs e Google. Agências comuns entregam WordPress pesado (R$ 3.000+) e você fica refém de plugin. Com a gente você economiza ~70% e ganha site pronto para IA — seu site estará otimizado para que os chats de IA possam mencionar nas interações, o que aumenta a probabilidade de estar sempre à frente da concorrência. Seu site é institucional e já vem com blog incluso para seus artigos estratégicos de tráfego orgânico. Tudo o que você precisa saber — valores, condições, flexibilidade, hospedagem inclusa — está aqui: https://sites.integridadedigital.com.br/planos. Qualquer dúvida, tô aqui."

**Lead**: "Quero pagar no PIX agora"
**Sophie**: "Perfeito! Na página de planos, clique na oferta com desconto no PIX do plano que escolher. Você será redirecionado ao WhatsApp +55 19 2120-1006 onde o agente financeiro confirma seu interesse e chama o humano para gerar a cobrança PIX: https://sites.integridadedigital.com.br/planos"

**Lead**: "Tenho urgência"
**Sophie**: "Entendo. A compra é pela página de planos — após o pagamento você recebe orientações passo a passo: https://sites.integridadedigital.com.br/planos"`;

// ============================================================
// 2. FAQ TÉCNICO (itens para ai_faq_items)
// ============================================================
const FAQ_ITEMS = [
  {
    question: "O que é Astro e por que é melhor que WordPress?",
    answer: "Astro é um framework moderno que entrega sites estáticos ultra-rápidos (HTML puro, zero JavaScript desnecessário). WordPress carrega PHP + banco + plugins a cada visita — Astro pré-renderiza tudo. Resultado: Core Web Vitals no verde, Lighthouse > 95, carregamento em milissegundos. Isso melhora SEO, conversão e experiência do usuário.",
    tags: ["astro", "wordpress", "performance", "tecnologia"],
    locale: "pt-BR"
  },
  {
    question: "Como funciona a otimização para chats de IA (ChatGPT, Gemini, Perplexity)?",
    answer: "Implementamos dados estruturados (Schema.org), sitemap.xml otimizado, llms.txt, robots.txt permissivo para crawlers de IA, conteúdo semântico e hierarquia clara. Isso permite que os modelos de linguagem \"leiam\" e indexem seu site corretamente, aumentando a probabilidade de seu site ser mencionado quando alguém perguntar sobre seu segmento nos chats de IA.",
    tags: ["ia", "llm", "chatgpt", "gemini", "perplexity", "geo", "otimizacao"],
    locale: "pt-BR"
  },
  {
    question: "Meu site vai aparecer no ChatGPT?",
    answer: "Não garantimos menção — nenhum site pode prometer isso. O que fazemos: seu site **estará otimizado para que os chats de IA possam mencionar nas interações**. Isso **aumenta a probabilidade de estar sempre à frente da concorrência** e **seu site pode aparecer nas menções de chats de IA** quando usuários buscarem soluções do seu nicho.",
    tags: ["ia", "chatgpt", "mencao", "promessa", "probabilidade"],
    locale: "pt-BR"
  },
  {
    question: "Qual o prazo de entrega?",
    answer: "O redesign **já foi entregue por e-mail** — você já tem o site novo. Se fechar, fazemos apenas ajustes de lançamento (cores, textos, favicon) em até 48h úteis.",
    tags: ["prazo", "entrega", "ajustes", "lancamento"],
    locale: "pt-BR"
  },
  {
    question: "Vocês migram meu conteúdo atual?",
    answer: "Sim. O redesign já inclui seu conteúdo reestruturado. Ajustes finos de copy/imagens são feitos nos ajustes de lançamento.",
    tags: ["migracao", "conteudo", "copy", "imagens"],
    locale: "pt-BR"
  },
  {
    question: "Tem blog incluso?",
    answer: "Sim. Seu site é institucional e já vem com blog incluso para seus artigos estratégicos de tráfego orgânico. Mais detalhes na página de planos.",
    tags: ["blog", "trafego", "organico", "artigos", "estrategicos"],
    locale: "pt-BR"
  },
  {
    question: "Tem suporte pós-entrega?",
    answer: "Sim. 30 dias de suporte técnico para ajustes de lançamento. Após isso, consulte a página de planos para opções de continuidade.",
    tags: ["suporte", "pos-entrega", "ajustes", "lancamento", "continuidade"],
    locale: "pt-BR"
  },
  {
    question: "E se meu site cair?",
    answer: "Nossos desenvolvedores estão sempre alerta para a devida correção imediata.",
    tags: ["queda", "site", "correcao", "desenvolvedores", "alerta"],
    locale: "pt-BR"
  },
  {
    question: "Como funciona o domínio?",
    answer: "Após o pagamento, nosso técnico vai te orientar no apontamento do seu domínio.",
    tags: ["dominio", "apontamento", "tecnico", "pagamento"],
    locale: "pt-BR"
  },
  {
    question: "Vocês atendem e-commerce?",
    answer: "Não. Nosso foco é sites institucionais com blog incluso para tráfego orgânico, prestadores de serviço, profissionais liberais e negócios locais de alta conversão. A página de planos detalha o escopo completo.",
    tags: ["ecommerce", "nao-atendemos", "escopo", "institucional", "blog"],
    locale: "pt-BR"
  }
];

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("🔍 Buscando agente Sophie...");

  // 1. Encontrar agente Sophie (por nome ou criar)
  let { data: sophieAgent } = await admin
    .from("ai_agents")
    .select("id, name, published_version_id, kind")
    .ilike("name", "%sophie%")
    .is("archived_at", null)
    .maybeSingle();

  if (!sophieAgent) {
    console.log("📝 Sophie não encontrada — criando novo agente mcp_agent...");
    const { data: newAgent, error: createErr } = await admin
      .from("ai_agents")
      .insert({
        name: "Sophie",
        description: "Especialista em redesign de sites Astro — converte leads via ancoragem de valor + página de planos",
        kind: "mcp_agent",
        priority: 100,
        is_default: false,
      })
      .select("id")
      .single();

    if (createErr || !newAgent) {
      console.error("❌ Erro ao criar agente:", createErr?.message);
      process.exit(1);
    }
    sophieAgent = newAgent;
    console.log(`✅ Agente Sophie criado: ${sophieAgent.id}`);
  } else {
    console.log(`✅ Agente Sophie encontrado: ${sophieAgent.id} (kind: ${sophieAgent.kind})`);
  }

  // Buscar organization_id do agente (usado em várias operações)
  const { data: agentOrg } = await admin
    .from("ai_agents")
    .select("organization_id")
    .eq("id", sophieAgent.id)
    .single();
  const orgId = agentOrg?.organization_id;
  if (!orgId) {
    console.error("❌ Não foi possível obter organization_id do agente");
    process.exit(1);
  }
  console.log(`🏢 Organization ID: ${orgId}`);

  // Channel session para Sophie: +1 555 734-9282 (Growth Hacking Oficial)
  const sophieChannelSessionId = "5f10b832-fbcd-4f0e-8fd6-3232e77a4626";
  console.log(`📱 Channel session Sophie: ${sophieChannelSessionId} (+1 555 734-9282)`);

  // Channel session do Financeiro (Ricardo Mendes): +55 19 2120-1006 (META_CLOUD)
  const financeiroChannelSessionId = "79159543-c814-470c-b520-54a124545a25";
  console.log(`📱 Channel session Financeiro: ${financeiroChannelSessionId} (+55 19 2120-1006)`);

  // 3. Criar/atualizar versão publicada com o novo system_prompt
  // MANTER provider, model, credential_id da versão publicada atual (NÃO ALTERAR CONFIGURAÇÕES DE LLM)
  console.log("\n📝 Criando nova versão publicada (mantendo configurações de LLM atuais)...");

  const { data: currentPublished } = await admin
    .from("ai_agent_versions")
    .select("provider, model, credential_id, version_number, max_steps, token_budget, cost_budget_cents, history_message_window, history_token_window, handoff_keywords, handoff_tool_enabled, cases_enabled, split_messages, split_max_chars")
    .eq("agent_id", sophieAgent.id)
    .eq("status", "published")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!currentPublished) {
    console.error("❌ Nenhuma versão publicada encontrada para copiar configurações de LLM");
    process.exit(1);
  }

  const nextVersion = currentPublished.version_number + 1;

  const { data: newVersion, error: versionErr } = await admin
    .from("ai_agent_versions")
    .insert({
      organization_id: orgId,
      agent_id: sophieAgent.id,
      version_number: nextVersion,
      system_prompt: SYSTEM_PROMPT,
      provider: currentPublished.provider,
      model: currentPublished.model,
      credential_id: currentPublished.credential_id,
      channel_session_id: sophieChannelSessionId,
      max_steps: currentPublished.max_steps,
      token_budget: currentPublished.token_budget,
      cost_budget_cents: currentPublished.cost_budget_cents,
      history_message_window: currentPublished.history_message_window,
      history_token_window: currentPublished.history_token_window,
      handoff_keywords: currentPublished.handoff_keywords,
      handoff_tool_enabled: currentPublished.handoff_tool_enabled,
      cases_enabled: currentPublished.cases_enabled,
      split_messages: currentPublished.split_messages,
      split_max_chars: currentPublished.split_max_chars,
      max_steps: 10,
      token_budget: 50000,
      cost_budget_cents: 50,
      history_message_window: 20,
      history_token_window: 8000,
      handoff_keywords: ["falar com humano", "atendente", "pessoa real"],
      handoff_tool_enabled: true,
      cases_enabled: false,
      split_messages: true,
      split_max_chars: 600,
      status: "published",
      published_at: new Date().toISOString(),
      knowledge_source_ids: [], // será atualizado depois
      created_by: (await admin.auth.getUser()).data.user?.id,
    })
    .select("id")
    .single();

  if (versionErr || !newVersion) {
    console.error("❌ Erro ao criar versão:", versionErr?.message);
    process.exit(1);
  }

  console.log(`✅ Versão v${nextVersion} criada: ${newVersion.id}`);

  // 4. Atualizar ponteiro published_version_id no agente
  const { error: ptrErr } = await admin
    .from("ai_agents")
    .update({ published_version_id: newVersion.id })
    .eq("id", sophieAgent.id);

  if (ptrErr) {
    console.error("❌ Erro ao atualizar ponteiro:", ptrErr.message);
    process.exit(1);
  }
  console.log("✅ Ponteiro published_version_id atualizado");

  // 5. Criar material FAQ na base de conhecimento
  console.log("\n📚 Criando material FAQ Técnico...");

  // Arquivar FAQ antigo se existir (unique constraint por agent_id + source_type + is_active)
  const { data: oldFaq } = await admin
    .from("ai_knowledge_sources")
    .select("id")
    .eq("agent_id", sophieAgent.id)
    .eq("source_type", "faq")
    .eq("is_active", true)
    .maybeSingle();

  if (oldFaq) {
    console.log(`📦 Arquivando FAQ antigo: ${oldFaq.id}`);
    await admin
      .from("ai_knowledge_sources")
      .update({ is_active: false, status: "archived", updated_at: new Date().toISOString() })
      .eq("id", oldFaq.id);
    // Limpar itens FAQ antigos
    await admin.from("ai_faq_items").delete().eq("knowledge_source_id", oldFaq.id);
    console.log("🗑️ Itens FAQ antigos removidos");
  }

  const { data: ks, error: ksErr } = await admin
    .from("ai_knowledge_sources")
    .insert({
      organization_id: orgId,
      agent_id: sophieAgent.id,
      source_type: "faq",
      name: "FAQ Técnico - Redesign Astro",
      status: "ready",
      is_active: true,
      source_metadata: { origem: "treinamento_sophie_script" },
      ingested_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (ksErr || !ks) {
    console.error("❌ Erro ao criar knowledge source:", ksErr?.message);
    process.exit(1);
  }

  const ksId = ks.id;
  console.log(`✅ Knowledge source criado: ${ksId}`);

  // 6. Inserir itens do FAQ
  console.log("📝 Inserindo itens do FAQ...");

  const faqRows = FAQ_ITEMS.map((item, idx) => ({
    organization_id: orgId,
    knowledge_source_id: ksId,
    question: item.question,
    answer: item.answer,
    tags: item.tags,
    locale: item.locale,
    position: idx,
  }));

  const { error: itemsErr } = await admin.from("ai_faq_items").insert(faqRows);

  if (itemsErr) {
    console.error("❌ Erro ao inserir itens FAQ:", itemsErr.message);
    process.exit(1);
  }
  console.log(`✅ ${FAQ_ITEMS.length} itens de FAQ inseridos`);

  // 7. Disparar evento de indexação
  console.log("🔄 Disparando indexação...");
  await admin.rpc("emit_event" as never, {
    p_event_type: "knowledge_source.updated",
    p_entity_kind: "ai_knowledge_source",
    p_entity_id: ksId,
    p_payload: { knowledge_source_id: ksId, agent_id: sophieAgent.id, source_type: "faq" },
    p_organization_id: orgId,
  } as never);
  console.log("✅ Evento de indexação disparado (worker vai processar)");

  // 8. Vincular knowledge_source à versão do agente
  console.log("\n🔗 Vinculando base de conhecimento à versão do agente...");
  const { error: linkErr } = await admin
    .from("ai_agent_versions")
    .update({ knowledge_source_ids: [ksId] })
    .eq("id", newVersion.id);

  if (linkErr) {
    console.error("❌ Erro ao vincular:", linkErr.message);
    process.exit(1);
  }
  console.log("✅ Vinculação concluída");

  // 9. Resumo final
  console.log("\n" + "=".repeat(60));
  console.log("🎉 SOPHIE TREINADA COM SUCESSO!");
  console.log("=".repeat(60));
  console.log(`Agente: Sophie (${sophieAgent.id})`);
  console.log(`Versão publicada: v${nextVersion} (${newVersion.id})`);
  console.log(`Provider: ${currentPublished.provider} | Model: ${currentPublished.model}`);
  console.log(`Base de conhecimento: FAQ Técnico - Redesign Astro (${ksId})`);
  console.log(`Itens indexados: ${FAQ_ITEMS.length}`);
  console.log(`Channel session Sophie: ${sophieChannelSessionId} (+1 555 734-9282)`);
  console.log(`Channel session Financeiro: ${financeiroChannelSessionId} (+55 19 2120-1006)`);
  console.log("\n📋 PRÓXIMOS PASSOS:");
  console.log("1. Aguarde indexação (worker processa em segundos) — status ficará 'Pronto'");
  console.log("2. Teste no Painel: /app/ai/agents/[id] → botão 'Testar'");
  console.log("3. Simule: 'Oi, sou o João. Quanto custa?'");
  console.log("4. Verifique: ancoragem + link + citação da base (Fonte: FAQ Técnico)");
  console.log("\n🔗 Link da página de planos: https://sites.integridadedigital.com.br/planos");
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});