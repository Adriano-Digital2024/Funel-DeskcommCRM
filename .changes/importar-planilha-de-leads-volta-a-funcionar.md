---
impacto: nada_mudou
secao: corrigido
titulo: O botão de importar planilha volta a funcionar, e os leads entram na primeira etapa aberta do funil
---

O botão *Importar planilha*, no quadro do funil, estava morto. Quem escolhia o
funil e mandava a planilha recebia sempre o mesmo aviso de erro — *"Escolha o
funil e a etapa de destino"* — mesmo tendo escolhido o funil. Nenhum lead era
criado, e não havia nada que o operador pudesse fazer para contornar: a tela não
tem, nem deveria ter, um campo de etapa. A capacidade foi anunciada na 1.14.0 e
seguiu assim nas duas atualizações seguintes — quem instalou a 1.14.0, a 1.15.0
ou a 1.15.1 nunca conseguiu importar uma planilha.

A causa era essa incompatibilidade mesmo: a tela pergunta só o funil, porque
planilha traz gente nova e gente nova entra no começo do funil; o servidor, por
outro lado, exigia que a etapa viesse junto. Agora o servidor resolve a etapa
sozinho, que é o que a tela sempre prometeu.

E ele resolve a etapa **aberta** de menos avançada — pulando as etapas de ganho
e as de perda. Isso importa para quem reorganizou o próprio funil: numa
instalação onde uma etapa do tipo *Pago* ou *Cancelado* foi arrastada para a
primeira coluna, a importação teria feito a planilha inteira nascer como negócio
já ganho, ou teria recusado todas as linhas devolvendo *"0 leads criados"* sem
explicar por quê. Quem nunca mexeu na ordem das etapas não estava exposto a
isso, porque o funil que vem pronto já começa com uma etapa aberta.

Nada muda no dia a dia de quem opera a instalação: nenhuma configuração nova,
nenhum passo de atualização, e nenhum lead já importado é tocado.

O achado é de @JowaniOrantes, que encontrou o problema usando o sistema pela
tela enquanto conferia a tradução para o espanhol — não lendo código.
