---
impacto: capacidade_nova
secao: adicionado
titulo: Automações podem disparar quando um contato ganha um telefone
---

O editor de regras automáticas ganhou o gatilho **"Quando um contato ganhar um telefone"** (`contact.phone_added`). Ele dispara na transição em que a ficha que estava **sem** número passa a ter um — e só nessa: quem já tinha telefone e trocou, quem perdeu o número e quem edita a ficha sem tocar no campo não disparam nada.

O evento é emitido **depois** da gravação do número, então uma regra que use as ações de mensagem (`send_whatsapp_message`, `send_ai_message`) encontra o telefone já na ficha e passa a guarda de contato — antes, a mesma regra morria em silêncio com o motivo `no_phone`, sem nova tentativa. É o gatilho que faltava para a operação que só consegue chamar o cliente no WhatsApp depois que ele informa o número.

Contribuição de @webtecnica (refs #2812).
