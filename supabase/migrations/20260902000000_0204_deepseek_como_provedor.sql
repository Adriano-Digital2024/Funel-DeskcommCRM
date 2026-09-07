-- ============================================================================
-- 0204 — DEEPSEEK ENTRA COMO PROVIDER PRÓPRIO (catálogo curado).
--
-- A 0127 abriu `provider` como vocabulário aberto justamente para este caso:
-- o banco aceita 'deepseek' desde então, e quem dizia se o provedor era
-- executável era o registry TypeScript. Esta migration completa o suporte
-- gravando no catálogo os DOIS modelos que a instalação oferece:
--
--   DeepSeek-V4-Flash-0731   (barato, para atender o cliente)
--   DeepSeek-V4-Pro          (raciocínio estendido, para tarefas pesadas)
--
-- ─── Preços PROVISÓRIOS, e a razão de não serem 0 ─────────────────────────
-- `ai_pricing`/`ai_models` é o que `lib/ai/cost.ts` usa para calcular o custo
-- de cada chamada. Linha sem preço devolve 0 — e custo 0 é a tela de Uso e a
-- de Execuções mostrando R$ 0,00 com o dinheiro saindo, que é o defeito que a
-- 0130 citou como motivo da unificação. Os valores abaixo espelham a faixa
-- pública do DeepSeek (deepseek-chat $0.27/$1.10, deepseek-reasoner
-- $0.55/$2.19 por milhão de tokens) e estão marcados como PROVISÓRIOS:
-- o dono da instalação deve conferi-los no painel do provedor e corrigir.
-- Id errado/obsoleto só falha na chamada; preço errado engana a tela.
--
-- Idempotente: `on conflict do update` nas duas tabelas. O default do provider
-- é limpo ANTES de marcar o novo, porque `ai_models_one_default_per_provider`
-- é UNIQUE parcial IMEDIATO.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. catálogo curado (o que a tela oferece para provider deepseek)
-- ---------------------------------------------------------------------------
insert into public.ai_models
  (provider, model_id, display_name, description,
   input_price_per_million_cents, output_price_per_million_cents, supports_tools)
values
  ('deepseek', 'DeepSeek-V4-Flash-0731', 'DeepSeek V4 Flash (0731)',
   'Modelo padrão do provedor DeepSeek para atender o cliente: rápido, barato e com suporte a ferramentas do CRM. Preço PROVISÓRIO a confirmar no painel do provedor.',
   27, 110, true),
  ('deepseek', 'DeepSeek-V4-Pro', 'DeepSeek V4 Pro',
   'Raciocínio estendido do DeepSeek para tarefas pesadas (análise, planejamento). Preço PROVISÓRIO a confirmar no painel do provedor.',
   55, 219, true)
on conflict (provider, model_id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  input_price_per_million_cents = excluded.input_price_per_million_cents,
  output_price_per_million_cents = excluded.output_price_per_million_cents,
  supports_tools = excluded.supports_tools;

-- ---------------------------------------------------------------------------
-- 2. padrão por provedor — o Flash é o default do DeepSeek.
--    Limpa o padrão ANTES de marcar o novo (índice UNIQUE parcial imediato).
-- ---------------------------------------------------------------------------
update public.ai_models set is_default_for_provider = false
 where provider = 'deepseek' and is_default_for_provider;

update public.ai_models set is_default_for_provider = true
 where provider = 'deepseek' and model_id = 'DeepSeek-V4-Flash-0731';

-- ---------------------------------------------------------------------------
-- 3. contabilidade de custo — a MESMA lista, senão o gasto some do orçamento.
-- ---------------------------------------------------------------------------
insert into public.ai_pricing
  (model, prompt_cents_per_million_tokens, completion_cents_per_million_tokens, notes)
values
  ('DeepSeek-V4-Flash-0731', 27, 110, 'catálogo 0204 — PROVISÓRIO, confirmar no provedor'),
  ('DeepSeek-V4-Pro',        55, 219, 'catálogo 0204 — PROVISÓRIO, confirmar no provedor')
on conflict (model) do update set
  prompt_cents_per_million_tokens = excluded.prompt_cents_per_million_tokens,
  completion_cents_per_million_tokens = excluded.completion_cents_per_million_tokens,
  notes = excluded.notes,
  superseded_at = null;
