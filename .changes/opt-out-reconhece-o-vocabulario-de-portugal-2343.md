---
impacto: nada_mudou
secao: corrigido
titulo: O opt-out passa a reconhecer o vocabulário de Portugal
---

Quem escreve de Portugal a pedir para sair passa a ser entendido. Antes, só as formas brasileiras eram reconhecidas.

Duas lacunas foram fechadas em `lib/opt-out/deteccao.ts`:

- **"cancelar a subscrição"** — a palavra `subscrição` não estava na lista de cancelamento; em Portugal é assim que se pede. `inscrição` e `assinatura` continuam a valer.
- **o pronome preso ao verbo** — em Portugal escreve-se "remova-me da lista" (pronome depois do verbo); no Brasil, "me remova da lista" (antes). A forma de Portugal não casava padrão nenhum.

A regra do Brasil não muda: as formas brasileiras continuam a funcionar, e há um teste que as percorre todas a cada execução.

O que ainda **não** entra: a exigência de consentimento por contato da Lei n.º 41/2004, art. 13.º-A. Falta schema novo — está medido no comentário da issue #2343.

Contribuição de @webtecnica (#2343).
