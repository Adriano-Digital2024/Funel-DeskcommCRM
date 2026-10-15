/**
 * Configura OpenRouter como provedor de embeddings para a base de conhecimento
 * 
 * Rode: npx tsx --env-file=.env.local scripts/configurar-openrouter-embeddings.ts
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  console.log("🔍 Verificando configuração de embeddings...");

  // 1. Buscar organização
  const { data: orgs, error: orgErr } = await admin
    .from("organizations")
    .select("id, name")
    .limit(1);

  if (orgErr || !orgs || orgs.length === 0) {
    console.error("❌ Não foi possível encontrar organização:", orgErr?.message);
    process.exit(1);
  }

  const orgId = orgs[0].id;
  console.log(`🏢 Organização: ${orgs[0].name} (${orgId})`);

  // 2. Verificar se já existe binding para embedding
  const { data: existingBinding } = await admin
    .from("ai_purpose_bindings")
    .select("id, credential_id, is_enabled")
    .eq("organization_id", orgId)
    .eq("purpose", "embedding_indexar")
    .maybeSingle();

  if (existingBinding) {
    console.log(`⚠️ Binding existente para embedding_indexar: ${existingBinding.id}`);
    console.log(`   Credential ID: ${existingBinding.credential_id || 'nenhuma'}`);
    console.log(`   Habilitado: ${existingBinding.is_enabled}`);
  }

  // 3. Buscar credencial OpenRouter
  const { data: credentials, error: credErr } = await admin
    .from("ai_provider_credentials")
    .select("id, label, provider, is_active, validated_at")
    .eq("organization_id", orgId)
    .eq("provider", "openrouter")
    .eq("is_active", true)
    .not("validated_at", "is", null);

  if (credErr) {
    console.error("❌ Erro ao buscar credenciais:", credErr.message);
    process.exit(1);
  }

  if (!credentials || credentials.length === 0) {
    console.error("❌ Nenhuma credencial OpenRouter ativa e validada encontrada");
    console.log("\n📋 Passos para resolver:");
    console.log("1. Acesse IA → Credenciais no painel");
    console.log("2. Cadastre uma chave OpenRouter (a Production_Openrouter)");
    console.log("3. Valide a chave");
    console.log("4. Execute este script novamente");
    process.exit(1);
  }

  console.log("\n✅ Credenciais OpenRouter encontradas:");
  credentials.forEach((cred) => {
    console.log(`   - ${cred.label} (${cred.id}) - Ativa: ${cred.is_active}, Validada: ${cred.validated_at ? 'Sim' : 'Não'}`);
  });

  // 4. Usar a primeira credencial encontrada
  const credentialId = credentials[0].id;

  // 5. Criar ou atualizar binding para embedding_indexar
  if (existingBinding) {
    console.log("\n🔄 Atualizando binding existente...");
    const { error: updateErr } = await admin
      .from("ai_purpose_bindings")
      .update({
        credential_id: credentialId,
        model_id: "openai/text-embedding-3-small",
        is_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingBinding.id);

    if (updateErr) {
      console.error("❌ Erro ao atualizar binding:", updateErr.message);
      process.exit(1);
    }
    console.log("✅ Binding atualizado com sucesso");
  } else {
    console.log("\n➕ Criando novo binding para embedding_indexar...");
    const { error: insertErr } = await admin
      .from("ai_purpose_bindings")
      .insert({
        organization_id: orgId,
        purpose: "embedding_indexar",
        credential_id: credentialId,
        model_id: "openai/text-embedding-3-small",
        is_enabled: true,
      });

    if (insertErr) {
      console.error("❌ Erro ao criar binding:", insertErr.message);
      process.exit(1);
    }
    console.log("✅ Binding criado com sucesso");
  }

  // 6. Criar binding para embedding_consultar (busca)
  const { data: existingSearchBinding } = await admin
    .from("ai_purpose_bindings")
    .select("id")
    .eq("organization_id", orgId)
    .eq("purpose", "embedding_consultar")
    .maybeSingle();

  if (!existingSearchBinding) {
    console.log("\n➕ Criando binding para embedding_consultar...");
    const { error: insertSearchErr } = await admin
      .from("ai_purpose_bindings")
      .insert({
        organization_id: orgId,
        purpose: "embedding_consultar",
        credential_id: credentialId,
        model_id: "openai/text-embedding-3-small",
        is_enabled: true,
      });

    if (insertSearchErr) {
      console.error("❌ Erro ao criar binding de busca:", insertSearchErr.message);
      // Não sair — o binding de indexação já foi criado
    } else {
      console.log("✅ Binding de busca criado com sucesso");
    }
  }

  // 7. Verificar knowledge sources pendentes
  const { data: pendingKS } = await admin
    .from("ai_knowledge_sources")
    .select("id, name, status, agent_id")
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .eq("is_active", true);

  if (pendingKS && pendingKS.length > 0) {
    console.log(`\n📚 ${pendingKS.length} knowledge source(s) pendente(s):`);
    pendingKS.forEach((ks) => {
      console.log(`   - ${ks.name} (agent: ${ks.agent_id})`);
    });
    console.log("\n💡 Após configurar o binding, execute o reindexamento:");
    console.log("   - Acesse IA → Base de conhecimento");
    console.log("   - Clique em 'Reindexar' para cada material pendente");
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 CONFIGURAÇÃO DE EMBEDDINGS CONCLUÍDA!");
  console.log("=".repeat(60));
  console.log("\n📋 PRÓXIMOS PASSOS:");
  console.log("1. Acesse IA → Base de conhecimento");
  console.log("2. Verifique se o status mudou para 'Pronto'");
  console.log("3. Se ainda estiver pendente, clique em 'Reindexar'");
  console.log("4. Teste o agente Sophie fazendo uma pergunta sobre Astro/planos");
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
