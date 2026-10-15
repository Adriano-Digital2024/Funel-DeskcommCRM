# 🎯 PLANO DE VENDAS — META: 6 VENDAS HOJE

## Resumo Executivo

**Meta**: Fechar 6 vendas hoje com os ~50 leads recentes
**Canal**: WhatsApp (Sophie → Financeiro → Humano)
**Produto**: Redesign de sites Astro com otimização para IA
**Página de planos**: https://sites.integridadedigital.com.br/planos

---

## 🔴 AÇÕES IMEDIATAS (Próximos 30 minutos)

### 1. Corrigir Base de Conhecimento (5 min)
```bash
cd /root/Funel-DeskcommCRM
npx tsx --env-file=.env.local scripts/configurar-openrouter-embeddings.ts
```
**Resultado**: Sophie poderá consultar FAQ técnica sobre Astro/planos

### 2. Treinar Agente Financeiro (5 min)
```bash
npx tsx --env-file=.env.local scripts/treinar-financeiro.ts
```
**Resultado**: Financeiro terá prompt profissional para qualificar e gerar PIX

### 3. Verificar Status (2 min)
- Acesse `/app/ai/agents`
- Confirme que Sophie e Financeiro estão ativos
- Teste ambos com mensagens de exemplo

---

## 📊 ESTRATÉGIA PARA 50 LEADS

### Segmentação dos Leads

| Segmento | Aproximada | Ação |
|----------|------------|------|
| **Quentes** (abriram e-mail, clicaram link) | ~15 leads | Sophie inicia conversa hoje |
| **Mornos** (abriram mas não clicaram) | ~20 leads | Follow-up com ancoragem de valor |
| **Frios** (não abriram) | ~15 leads | Reenvio com novo título |

### Cronograma de Hoje

| Horário | Ação | Responsável |
|---------|------|-------------|
| **09:00** | Configurar embeddings + Treinar financeiro | Você (já feito) |
| **09:30** | Sophie inicia conversa com leads quentes (15) | Sophie (automático) |
| **10:00** | Monitorar respostas e handoffs | Você |
| **11:00** | Follow-up para leads mornos (20) | Sophie (automático) |
| **14:00** | Segundo follow-up para não-respostas | Sophie (automático) |
| **16:00** | Reenvio para leads frios com novo título | Sophie (automático) |
| **18:00** | Análise de resultados | Você |

---

## 📝 MENSAGENS PARA LEADS QUENTES (Sophie)

### Primeira Mensagem (automática)
> "Olá [NOME]! Que bom que você apareceu — o redesign do seu site já está pronto e te enviamos por e-mail. **O que achou da nova versão?**"

### Follow-up (se não responder em 2h)
> "Oi [NOME]! Vi que você abriu o e-mail com o redesign. Qualquer dúvida sobre o site novo, estou aqui para ajudar!"

### Ancoragem de Valor (se perguntar preço)
> "Vai depender do plano que você escolher. Acesse a página de planos e confira: https://sites.integridadedigital.com.br/planos — lá você terá a chance de obter uma oferta com desconto no PIX."

---

## 📝 MENSAGENS PARA LEADS MORNOS (Sophie)

### Follow-up 1 (hoje)
> "Oi [NOME]! Enviamos o redesign do seu site por e-mail. Não se esqueça de conferir — seu site novo já está pronto com tecnologia Astro e otimização para IA!"

### Follow-up 2 (amanhã)
> "[NOME], seu site redesignado está pronto! Qualquer dúvida sobre planos ou tecnologia, me chame: https://sites.integridadedigital.com.br/planos"

---

## 📝 ESTRATÉGIA PARA LEADS FRIO (Reenvio)

### Novo Título do E-mail
- ❌ Antigo: "Redesign do seu site pronto"
- ✅ Novo: "Seu site pode estar perdendo clientes para a IA"

### Corpo do E-mail (resumido)
> [NOME], sites que não são otimizados para chats de IA (ChatGPT, Gemini, Perplexity) estão perdendo visibilidade.
>
> Preparamos uma proposta de redesign com tecnologia Astro que resolve isso.
>
> Confira: [LINK]
>
> Fortune Digital

---

## 🔄 FLUXO DE CONVERSÃO

```
Lead Quente
    ↓
Sophie: "O que achou do redesign?"
    ↓
Lead: "Gostei, quanto custa?"
    ↓
Sophie: Ancoragem → Link para planos
    ↓
Lead: Clica em PIX
    ↓
Financeiro: "Vi que você escolheu o plano X"
    ↓
Financeiro: Coleta dados → Chama humano
    ↓
Humano: Gera PIX → Fecha venda
    ↓
✅ VENDA CONCLUÍDA
```

---

## 📈 MÉTRICAS DE SUCESSO

| Métrica | Meta | Como medir |
|---------|------|------------|
| **Taxa de abertura** | >40% | E-mail provider |
| **Taxa de resposta** | >25% | Sophie/Financeiro |
| **Cliques na página** | >15% | Google Analytics |
| **Conversões PIX** | 6 vendas | Financeiro + Humano |
| **Ticket médio** | R$ X | Planos vendidos |

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. Base de Conhecimento
- Se embeddings não funcionarem, Sophie responderá sem consultar FAQ
- **Solução**: Verificar se OpenRouter está configurado em IA → Credenciais

### 2. Agente Financeiro
- Se não estiver treinado, pode confundir leads
- **Solução**: Executar `treinar-financeiro.ts` antes de iniciar

### 3. Horário de Envio
- WhatsApp: janela 7h-22h (domingo liberado)
- **Recomendação**: Iniciar envios às 9h para maximizar respostas

### 4. Handoff para Humano
- Financeiro DEVE chamar humano rapidamente
- **Recomendação**: Monitorar canal +55 19 2120-1006

---

## 🛠️ COMANDOS PARA EXECUTAR

```bash
# 1. Configurar embeddings (5 min)
cd /root/Funel-DeskcommCRM
npx tsx --env-file=.env.local scripts/configurar-openrouter-embeddings.ts

# 2. Treinar financeiro (5 min)
npx tsx --env-file=.env.local scripts/treinar-financeiro.ts

# 3. Verificar status (2 min)
# Acesse: https://app.fortunadigital.me/app/ai/agents
```

---

## 📞 CONTATOS IMPORTANTES

| Canal | Número | Uso |
|-------|--------|-----|
| **Sophie** | +1 555 734-9282 | Vendas (automático) |
| **Financeiro** | +55 19 2120-1006 | Confirmação PIX |
| **Suporte** | [definir] | Dúvidas técnicas |

---

## ✅ CHECKLIST PRÉ-LANÇAMENTO

- [ ] Embeddings configurados (OpenRouter)
- [ ] Sophie treinada e ativa
- [ ] Financeiro treinado e ativo
- [ ] Página de planos funcional
- [ ] PIX configurado no gateway
- [ ] Monitoramento ativo
- [ ] Horário de envio respeitado (7h-22h)

---

**Status**: ⏳ Aguardando execução dos comandos
**Próximo passo**: Executar `configurar-openrouter-embeddings.ts` e `treinar-financeiro.ts`
