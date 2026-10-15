-- FIX: Adicionar colunas faltantes em ai_knowledge_versions
-- Execute no Supabase Dashboard → SQL Editor

-- 1. Adicionar knowledge_source_id
ALTER TABLE public.ai_knowledge_versions
ADD COLUMN IF NOT EXISTS knowledge_source_id uuid;

-- 2. Adicionar embedding_model
ALTER TABLE public.ai_knowledge_versions
ADD COLUMN IF NOT EXISTS embedding_model text;

-- 3. Adicionar embedding_dims
ALTER TABLE public.ai_knowledge_versions
ADD COLUMN IF NOT EXISTS embedding_dims integer;

-- 4. Adicionar FK para knowledge_source_id
ALTER TABLE public.ai_knowledge_versions
ADD CONSTRAINT ai_knowledge_versions_knowledge_source_id_fkey
FOREIGN KEY (knowledge_source_id)
REFERENCES public.ai_knowledge_sources(id)
ON DELETE SET NULL;

-- 5. Criar índice para busca por fonte
CREATE INDEX IF NOT EXISTS idx_kb_versions_source
ON public.ai_knowledge_versions(knowledge_source_id)
WHERE knowledge_source_id IS NOT NULL;

-- 6. Comentários das colunas
COMMENT ON COLUMN public.ai_knowledge_versions.knowledge_source_id IS
'Fonte de conhecimento que esta versão indexa. Cada versão pertence a UMA fonte.';

COMMENT ON COLUMN public.ai_knowledge_versions.embedding_model IS
'Modelo de embedding usado para gerar os vetores desta versão (ex: openai/text-embedding-3-small).';

COMMENT ON COLUMN public.ai_knowledge_versions.embedding_dims IS
'Dimensão dos vetores de embedding (ex: 1536 para text-embedding-3-small).';

-- 7. Verificar se as colunas foram adicionadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_knowledge_versions'
AND column_name IN ('knowledge_source_id', 'embedding_model', 'embedding_dims')
ORDER BY column_name;
