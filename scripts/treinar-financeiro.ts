/**
 * Treina o Agente Financeiro: system prompt + vinculação ao canal
 * 
 * Rode: npx tsx --env-file=.env.local scripts/treinar-financeiro.ts
 * (precisa de SUPABASE_SERVICE_ROLE_KEY no .env.local)
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// ============================================================
// 1. SYSTEM PROMPT DO AGENTE FINANCEIRO
// ============================================================
const SYSTEM_PROMPT = `# Agente Financeiro — Confirmação e Handoff

## Identidade
Você é o agente financeiro da Fortune Digital. Confirme o plano escolhido e encaminhe para humano gerar o PIX.

## Regras
1. O lead JÁ escolheu um plano na página de planos
2. NUNCA gere PIX sozinho — sempre chame humano
3. NUNCA prometa desconto adicional
4. NUNCA informe valores (estão na página)
5. Respostas com no máximo 2-3 frases curtas
6. Tom profissional: sem emojis, sem informalidade
7. Seja direto e objetivo

## Fluxo
1. Confirme o plano escolhido
2. Colete nome e e-mail
3. Chame humano para gerar PIX

## Respostas

| Pergunta | Resposta curta |
|----------|---------------|
| "Quanto é?" | "O valor está na página que acessou. Qual plano escolheu?" |
| "Cartão?" | "Selecione cartão na página de planos. É automático." |
| "Desconto?" | "O desconto PIX já está aplicado no plano escolhido." |

## Exemplo
Lead: "Quero PIX do Profissional"
Você: "Plano Profissional confirmado. Me envie nome e e-mail para prosseguir."`;

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("🔍 Buscando agente Financeiro...");

  // 1. Encontrar agente Financeiro (por nome ou criar)
  let { data: financeiroAgent } = await admin
    .from("ai_agents")
    .select("id, name, published_version_id, kind")
    .ilike("name", "%financeiro%")
    .is("archived_at", null)
    .maybeSingle();

  // Buscar organization_id existente (necessário para criar agente)
  const { data: existingOrg } = await admin
    .from("ai_agents")
    .select("organization_id")
    .not("organization_id", "is", null)
    .limit(1)
    .maybeSingle();
  
  let orgId = existingOrg?.organization_id;
  
  if (!orgId) {
    // Se não há agentes, buscar da tabela organizations
    const { data: org } = await admin
      .from("organizations")
      .select("id")
      .limit(1)
      .maybeSingle();
    orgId = org?.id;
  }
  
  if (!orgId) {
    console.error("❌ Nenhuma organização encontrada no banco de dados");
    process.exit(1);
  }
  console.log(`🏢 Organization ID: ${orgId}`);

  if (!financeiroAgent) {
    console.log("📝 Agente Financeiro não encontrado — criando novo agente mcp_agent...");
    const { data: newAgent, error: createErr } = await admin
      .from("ai_agents")
      .insert({
        organization_id: orgId,
        name: "Financeiro",
        description: "Agente de confirmação de interesse e geração de PIX — qualifica leads que escolheram pagamento via PIX",
        system_prompt: SYSTEM_PROMPT,
        kind: "mcp_agent",
        priority: 90,
        is_default: false,
      })
      .select("id")
      .single();

    if (createErr || !newAgent) {
      console.error("❌ Erro ao criar agente:", createErr?.message);
      process.exit(1);
    }
    financeiroAgent = newAgent;
    console.log(`✅ Agente Financeiro criado: ${financeiroAgent.id}`);
  } else {
    console.log(`✅ Agente Financeiro encontrado: ${financeiroAgent.id} (kind: ${financeiroAgent.kind})`);
    // Atualizar orgId se o agente já existir
    const { data: agentOrg } = await admin
      .from("ai_agents")
      .select("organization_id")
      .eq("id", financeiroAgent.id)
      .single();
    if (agentOrg?.organization_id) {
      orgId = agentOrg.organization_id;
    }
  }

  // Channel session do Financeiro (Ricardo Mendes): +55 19 2120-1006 (META_CLOUD)
  const financeiroChannelSessionId = "79159543-c814-470c-b520-54a124545a25";
  console.log(`📱 Channel session Financeiro: ${financeiroChannelSessionId} (+55 19 2120-1006)`);

  // 2. Criar/atualizar versão publicada com o novo system_prompt
  console.log("\n📝 Criando nova versão publicada...");

  const { data: currentPublished } = await admin
    .from("ai_agent_versions")
    .select("provider, model, credential_id, version_number, max_steps, token_budget, cost_budget_cents, history_message_window, history_token_window, handoff_keywords, handoff_tool_enabled, cases_enabled, split_messages, split_max_chars")
    .eq("agent_id", financeiroAgent.id)
    .eq("status", "published")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Se não existe versão publicada, criar com configurações padrão
  const nextVersion = currentPublished ? currentPublished.version_number + 1 : 1;
  const provider = currentPublished?.provider || "google";
  const model = currentPublished?.model || "gemini-2.0-flash-001";
  const credentialId = currentPublished?.credential_id || null;

  const { data: newVersion, error: versionErr } = await admin
    .from("ai_agent_versions")
    .insert({
      organization_id: orgId,
      agent_id: financeiroAgent.id,
      version_number: nextVersion,
      system_prompt: SYSTEM_PROMPT,
      provider: provider,
      model: model,
      credential_id: credentialId,
      channel_session_id: financeiroChannelSessionId,
      max_steps: 5,
      token_budget: 10000,
      cost_budget_cents: 15,
      history_message_window: 10,
      history_token_window: 4000,
      handoff_keywords: ["falar com humano", "atendente", "pessoa real", "gerar pix", "pagar"],
      handoff_tool_enabled: true,
      cases_enabled: false,
      split_messages: true,
      split_max_chars: 300,
      status: "published",
      published_at: new Date().toISOString(),
      knowledge_source_ids: [],
      created_by: (await admin.auth.getUser()).data.user?.id,
    })
    .select("id")
    .single();

  if (versionErr || !newVersion) {
    console.error("❌ Erro ao criar versão:", versionErr?.message);
    process.exit(1);
  }

  console.log(`✅ Versão v${nextVersion} criada: ${newVersion.id}`);

  // 3. Atualizar ponteiro published_version_id no agente
  const { error: ptrErr } = await admin
    .from("ai_agents")
    .update({ published_version_id: newVersion.id })
    .eq("id", financeiroAgent.id);

  if (ptrErr) {
    console.error("❌ Erro ao atualizar ponteiro:", ptrErr.message);
    process.exit(1);
  }
  console.log("✅ Ponteiro published_version_id atualizado");

  // 4. Resumo final
  console.log("\n" + "=".repeat(60));
  console.log("🎉 AGENTE FINANCEIRO TREINADO COM SUCESSO!");
  console.log("=".repeat(60));
  console.log(`Agente: Financeiro (${financeiroAgent.id})`);
  console.log(`Versão publicada: v${nextVersion} (${newVersion.id})`);
  console.log(`Provider: ${provider} | Model: ${model}`);
  console.log(`Channel session: ${financeiroChannelSessionId} (+55 19 2120-1006)`);
  console.log("\n📋 COMPORTAMENTO ESPERADO:");
  console.log("1. Lead clica em PIX na página de planos");
  console.log("2. Redirecionado para WhatsApp +55 19 2120-1006");
  console.log("3. Agente confirma plano escolhido e coleta dados");
  console.log("4. Chama humano para gerar cobrança PIX");
  console.log("\n🔗 Link da página de planos: https://sites.integridadedigital.com.br/planos");
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
