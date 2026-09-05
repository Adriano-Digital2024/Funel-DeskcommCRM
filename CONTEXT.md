# Atendimento automático no WhatsApp

Vocabulário da configuração de acesso da IA, conforme a issue #573.

## Language

**Modo de teste do canal**:
Pré-go-live com mensagens reais no WhatsApp, no qual apenas os telefones cadastrados para aquele canal podem receber respostas automáticas.
_Avoid_: sandbox, simulador, teste do agente.

**Teste do agente**:
Conversa de validação no editor do agente, sem enviar mensagens ao WhatsApp.
_Avoid_: pré-go-live, modo de teste do canal.

**Atendimento aberto**:
Canal em que a lista de teste não restringe o público da IA. Publicação do agente, bloqueios do contato e intervenção humana continuam valendo.
_Avoid_: ignorar todas as restrições.

**Autorização por origem**:
Elegibilidade temporária de um contato por formulário, campanha, automação ou retomada manual. Não substitui a lista de telefones enquanto o canal está em modo de teste.
_Avoid_: número de teste.
