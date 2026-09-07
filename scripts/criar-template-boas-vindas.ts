/**
 * Cria o template "boas_vindas_redesign" na conta Meta via Graph API.
 *
 * Modelo de boas-vindas ao lead — categoria UTILITY (sem custo de marketing).
 * Texto: Sophie do time do Adriano Vieira, oferece envio de proposta de site.
 *
 *   pnpm exec tsx --env-file=.env.local scripts/criar-template-boas-vindas.ts
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { montarComponents } from "@/lib/channels/template-conteudo";

const TEMPLATE_NAME = "boas_vindas_redesign";
const IDIOMA = "pt_BR";
const CATEGORIA = "UTILITY";

const CORPO = `Olá {{1}}! Aqui é a Sophie, do time do Adriano Vieira.

Já viu a nova versão do seu site que enviamos para seu email? Se preferir, posso te enviar aqui mesmo.

Me conte qual melhor opção para você?`;

const RODAPE = null;

const EXEMPLOS = ["Maria"];

const BOTOES = [
  {
    tipo: "url" as const,
    texto: "Ver proposta",
    url: "https://seusite.com/proposta",
  },
];

async function main() {
  const db = createAdminClient();

  // Resolve a WABA (WhatsApp Business Account) da organização ativa.
  const { data: sessao, error } = await db
    .from("channel_sessions")
    .select("organization_id, meta_waba_id, provider")
    .eq("provider", "meta_cloud")
    .maybeSingle();

  if (error || !sessao?.meta_waba_id) {
    throw new Error(
      `sem sessão meta_cloud com waba_id: ${error?.message ?? "nenhuma linha"}`,
    );
  }

  const wabaId = sessao.meta_waba_id;
  const token = process.env.META_SYSTEM_USER_TOKEN;
  const graphVersion = process.env.META_GRAPH_VERSION ?? "v22.0";

  if (!token) {
    throw new Error("META_SYSTEM_USER_TOKEN não definido no .env.local");
  }

  console.info(`WABA: ${wabaId}`);
  console.info(`Criando template "${TEMPLATE_NAME}" (${IDIOMA}) — categoria ${CATEGORIA}`);

  const components = montarComponents({
    body: CORPO,
    footer: RODAPE,
    exemplos: EXEMPLOS,
    botoes: BOTOES,
  });

  console.info(`Components montados: ${JSON.stringify(components, null, 2)}`);

  const url = `https://graph.facebook.com/${graphVersion}/${wabaId}/message_templates`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: TEMPLATE_NAME,
      language: IDIOMA,
      category: CATEGORIA,
      components,
    }),
  });

  const json = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    console.error(`ERRO ${res.status}:`, JSON.stringify(json, null, 2));
    process.exit(1);
  }

  console.info("\n✅ Template criado com sucesso!");
  console.info(JSON.stringify(json, null, 2));
  console.info("\nStatus: PENDING — aguardando revisão da Meta (24-48h).");
  console.info("Depois de aprovado, sincronize no CRM em Conexões → Templates da Meta → Sincronizar.");
}

void main();
