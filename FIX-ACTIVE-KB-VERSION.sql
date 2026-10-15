-- FIX: Adicionar active_kb_version_id em ai_knowledge_sources
-- Execute no Supabase Dashboard → SQL Editor

-- 1. Adicionar coluna active_kb_version_id
ALTER TABLE public.ai_knowledge_sources
ADD COLUMN IF NOT EXISTS active_kb_version_id uuid;

-- 2. Adicionar FK
ALTER TABLE public.ai_knowledge_sources
ADD CONSTRAINT ai_knowledge_sources_active_kb_version_id_fkey
FOREIGN KEY (active_kb_version_id)
REFERENCES public.ai_knowledge_versions(id)
ON DELETE SET NULL;

-- 3. Criar índice
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_active_version
ON public.ai_knowledge_sources(active_kb_version_id)
WHERE active_kb_version_id IS NOT NULL;

-- 4. Comentário
COMMENT ON COLUMN public.ai_knowledge_sources.active_kb_version_id IS
'Versão de índice ativa para busca. Cada fonte aponta para UMA versão.';

-- 5. Verificar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_knowledge_sources'
AND column_name = 'active_kb_version_id';
