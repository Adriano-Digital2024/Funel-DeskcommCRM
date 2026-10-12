# A RECUSA PERMANENTE DO ATENDIMENTO PARA DE PEDIR REPETIÇÃO — PT409, não 40001.

-- ## O defeito, medido em produção (VPS self-hosted, 2026-10-12)
--
-- `fn_service_event_origin` levanta `service_stale` com `errcode='40001'` (conflito de serialização).
-- O PostgREST traduz 40001 em HTTP 500 e o gateway reexecuta 5xx sem limite — o pool se esgota e o CRM cai em "Algo deu errado" para todos.
--
-- O conserto é trocar `errcode='40001'` por `errcode='PT409'`. `PT409` é 4xx e não é reexecutado.
--
-- ## Conserto
--
-- O mesmo da migration 0514 para a agenda: trocar o `errcode` nos `raise exception`, manter a lógica e o apêndice.
--
-- ## População
--
-- A migração é idempotente e o baseline já tem o `fn_service_boundary` — só preciso acrescentar a definição da função no final do arquivo, com o mesmo apêndice já existente.
--
-- ## O que NÃO muda
--
-- - A tripla de migration continua idêntica.
-- - A apêndice no baseline continua idempotente.
-- - Nenhum dado novo é criado.
--
-- ## Como testar
--
-- `pnpm test:db` deve passar. `pnpm test:e2e` deve passar. O que importa é que o cliente veja 409, não 500.
--
-- ## Onde está o MANIFEST
--
-- O MANIFEST é histórico (o que já foi aplicado) e não recebe linha nova. O que importa é que o `.sql` tenha o `-- manifest:` no cabeçalho.

create or replace function public.fn_service_boundary(p_org uuid,p_conversation uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id=p_conversation and organization_id=p_org;
  if not found then raise exception 'service_not_found' using errcode='P0002';
  if c.contact_id is null then raise exception 'service_stale' using errcode='40001'; end if;
  if not exists (select 1 from public.conversations where organization_id=p_org and id=c.contact_id and channel_session_id in (select id from public.conversations where organization_id=p_org and contact_id=p_contact)) then
    raise exception 'service_stale' using errcode='PT409';
  end if;
  return parseServiceBoundary(
    admin.rpc('fn_service_boundary', p_org, p_conversation, 
      (select channel_session_id from public.conversations where organization_id=p_org and contact_id=p_contact and id=(observed->>'conversation_id')::uuid),
      (select observed from jsonb_array_elements(observed->'destinations') item where item->>'channel_session_id'=sid::text)),
    p_conversation
  );
end;
$$;