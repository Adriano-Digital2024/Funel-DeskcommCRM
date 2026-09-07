---
impacto: capacidade_nova
secao: adicionado
titulo: Teste a IA no WhatsApp antes de abrir o atendimento ao público
---

Em Conexões, administradores podem ativar o modo de teste e cadastrar números
de confiança por canal. Lista vazia bloqueia respostas automáticas; as mensagens
continuam chegando ao Inbox para atendimento humano. Após validar, a abertura
ao público exige confirmação e preserva a lista para uma futura rodada de testes.

Novos canais começam em teste, sem números autorizados. Canais existentes e
reconexões preservam a configuração atual. A atualização inclui a migration
0218 no baseline; não é preciso editar variáveis de ambiente.

Muda também para quem não vai usar o modo de teste: o follow-up automático por
silêncio passa a usar a mesma regra do atendimento de entrada, e num canal com
acesso da IA restrito ele deixa de inscrever contato cuja autorização já venceu
(o prazo é o de sempre, `AI_ALLOWLIST_TTL_DAYS`). Antes bastava ter sido
autorizado um dia; agora a autorização precisa estar valendo.
