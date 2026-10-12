---
impacto: nada_mudou
secao: corrigido
titulo: Recusa permanente do atendimento e da agenda para de travar o PostgREST (PT409, não 40001)
---
Recusas que nunca vão passar (`service_stale`, `google_stale`, `appointment_stale` e outras 14) saíam do banco com `errcode='40001'`, que quer dizer "conflito de serialização, tente de novo". O PostgREST 14 acredita e refaz a transação sozinho, sem limite. Numa instalação self-hosted, uma única chamada recusada virou ~1.750 rollbacks/s, o pool esgotado (`PGRST003`), o banco em 243% de CPU e o CRM inteiro em "Algo deu errado". A guarda da 0250 não alcança esse caso, porque depende do `sb-request-id`, que o self-host não carimba. A migration 0654 troca o código por `PT409` nos 34 pontos de recusa permanente de 16 funções. O PostgREST responde 409 e não repete. `service_contact_changed`, `appointment_notice_busy` e `contact_redaction_busy` continuam `40001`, porque ali repetir passa. As rotas de demandas, agendamentos e agendas do Google respondem 409 com `PT409` ou `40001`. O código antigo continua aceito, porque o banco e a imagem não se atualizam no mesmo instante. — Paulo
