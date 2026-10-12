---
impacto: capacidade_nova
secao: corrigido
titulo: Recusas permanentes (service_stale, google_stale, appointment_stale) saem como PT409, não 40001
---
O `errcode='40001'` (conflito de serialização) era tratado pelo PostgREST como HTTP 500, que o gateway do Supabase reexecuta sem limite. Numa instalação self-hosted (sem `sb-request-id`), uma única chamada de `fn_service_event_origin` que recusava um evento stale virou ~1.750 rollbacks/s, o pool esgotado (`PGRST003`), o banco em 243% de CPU e o CRM inteiro em "Algo deu errado". A guarda da 0250 (`fn_pgrst_recusar_replay_do_gateway`) não alcança esse caso porque o cabeçalho que ela lê só o gateway da nuvem carimba. O conserto é trocar `40001` por `PT409` nos 79 pontos de raise de recusa permanente, que chega como 409 e não é reexecutado. `service_contact_changed` continua `40001`, porque repetir passa. Migration 0700. O baseline recebe a definição da função atualizada. O cliente (`lib/atendimento/origem.ts`) lê `PT409` ou `40001` como recusa. — Paulo
