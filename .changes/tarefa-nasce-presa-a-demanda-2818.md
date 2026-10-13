---
impacto: capacidade_nova
secao: adicionado
titulo: A tarefa criada dentro do atendimento nasce presa à demanda, sem sair do inbox
---
O atendente está na conversa, combina algo com o cliente ("te chamo amanhã", "vou verificar o orçamento") e tinha dois caminhos ruins: abrir a aba Tarefas, que não sabe de qual atendimento ele estava falando — o formulário não pergunta negócio nem contato, e a tarefa nasce avulsa —, ou escrever na nota da conversa, que é texto: não tem prazo, responsável nem situação, não entra na lista de abertas e não lembra ninguém. Em ambos o combinado morria: não voltava para a tela de quem precisa cumpri-lo.

Agora `crm_tasks` tem `demanda_id` (`uuid`, FK para `demandas`, `on delete set null` — apagar ou encerrar a demanda não apaga o combinado: a tarefa continua na lista com o vínculo zerado), com índice parcial em `(demanda_id) where demanda_id is not null`. É aditiva e reversível, sem reescrita de dado: instalação existente não muda de comportamento até alguém usar o vínculo novo, e a RLS por `organization_id` de `crm_tasks` já cobre a coluna.

A API `POST/GET /api/v1/tasks` aceita `demanda_id` no corpo e o filtro `?demanda_id=`, e `PATCH /api/v1/tasks/[id]` vincula e desvincula — nada disso é obrigatório: a tarefa avulsa continua sendo caso real e o caminho antigo da aba Tarefas segue idêntico. No painel do Inbox, a seção "Tarefas desta demanda" lista o que ficou combinado na demanda vigente da conversa (só as abertas, com a mesma régua de prazo da tela de Tarefas) e o botão "Nova tarefa" abre o formulário já existente — sem tela nova e sem cópia de formulário — deixando a tarefa presa à demanda, ao contato e ao negócio ativo, com quem criou como responsável. A tarefa criada ali aparece na aba Tarefas como qualquer outra. — Marcos
