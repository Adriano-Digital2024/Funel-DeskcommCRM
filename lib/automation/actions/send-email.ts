/**
 * Ação `send_email` (#2726) — o e-mail como SAÍDA das regras.
 *
 * ═══ O que esta ação NÃO faz ═══
 *
 * Ela não escolhe transporte, não abre conexão e não conhece credencial: quem
 * entrega é `lib/email/roteador.ts` (SMTP configurado → SMTP; sem SMTP →
 * Resend), o MESMO caminho de um convite ou de um alarme de LGPD. Escrever um
 * segundo transporte aqui seria o defeito que o roteador existe para matar
 * (ver o cabeçalho dele: trocar oito `import` por um não é somar).
 *
 * ═══ O que ela faz ═══
 *
 *   1. resolve PARA QUEM (contato do negócio, responsável do negócio ou um
 *      endereço fixo escrito na tela);
 *   2. renderiza assunto e corpo com as MESMAS variáveis do WhatsApp
 *      (`{{nome}}`, `{{primeiro_nome}}`, `{{lead.*}}` e os campos do funil
 *      como `{{destino}}`) — `renderTemplate` é o mesmo de sempre;
 *   3. entrega o pedido pronto e registra o desfecho honesto: sucesso só com
 *      o resultado do provedor na mão, recusa de configuração/destinatário
 *      como `skipped`, e falha do transporte como `failed` com o CÓDIGO no
 *      `error` (é o que a aba Atividade traduz, ver `MOTIVO_DA_PARADA`) e a
 *      mensagem crua do provedor no `detail.error`, como detalhe técnico.
 *
 * ═══ Por que as recusas são `skipped` e as do transporte são `failed` ═══
 *
 * A mesma régua de `create-task.ts`: sem e-mail no contato ou opt-out
 * registrado é uma recusa que REENVIAR não conserta (o reenvio bate no mesmo
 * contato); recusa de CONFIGURAÇÃO como `failed` ensinaria quem opera a
 * tentar de novo sem mudar nada. Já o provedor caindo no meio do caminho é
 * infraestrutura — `failed` diz que tentou e não deu, que é o que a pessoa
 * precisa para olhar Admin › E-mail.
 *
 * O consentimento segue o gate FIXO de `guarda-do-contato.ts` (lê
 * `declined_at`, não a ausência de `granted_at` — ver o cabeçalho daquele
 * arquivo): sem isso, TODO contato que nunca perguntado não receberia nada.
 */
import { registerAction } from "@/lib/automation/actions";
import type { ActionCtx, ActionResultDetail } from "@/lib/automation/types";
import { renderTemplate } from "@/lib/automation/template";
import { sendEmail, type EmailDeliveryError } from "@/lib/email/roteador";

/** Quem recebe: o contato, o responsável do negócio ou um endereço gravado na regra. */
type Destinatario = "contato" | "dono_do_lead" | "fixo";

/**
 * Endereço com cara de endereço. NÃO é validação de entregabilidade — é o
 * piso: `to: "sem arroba"` não é um endereço a tentar, é configuração torta
 * que o provedor devolveria como erro genérico três segundos depois.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailValido(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return EMAIL.test(limpo) ? limpo : null;
}

interface ContatoDoContexto {
  id: string;
  is_blocked?: boolean;
  email?: string | null;
  consent?: { marketing?: { declined_at?: string | null } | null } | null;
}

/** O veredito do destinatário — o `motivo` é o que vira `detail.reason`. */
type DestinatarioResolvido = { ok: true; endereco: string } | { ok: false; motivo: string };

/**
 * PARA QUEM este envio sai, com as recusas na frente.
 *
 * A ordem importa: bloqueio e opt-out vêm ANTES do endereço, porque dizer
 * "sem e-mail" para um contato que pediu para não receber ensinaria quem lê
 * a caçar um cadastro que não é o problema.
 */
async function resolverDestinatario(
  ctx: ActionCtx,
  destinatario: Destinatario,
  fixo: string,
): Promise<DestinatarioResolvido> {
  if (destinatario === "fixo") return { ok: true, endereco: fixo };

  if (destinatario === "dono_do_lead") {
    const lead = ctx.context.lead as { owner_user_id?: string | null } | undefined;
    const ownerId = typeof lead?.owner_user_id === "string" ? lead.owner_user_id : null;
    if (!ownerId) return { ok: false, motivo: "dono_sem_email" };
    try {
      const { data } = await ctx.admin.auth.admin.getUserById(ownerId);
      const email = emailValido(data?.user?.email);
      return email ? { ok: true, endereco: email } : { ok: false, motivo: "dono_sem_email" };
    } catch {
      // Mesma tolerância de `call-webhook.ts`: o apelido/contato do dono nunca
      // derruba o envio inteiro — aqui ele só não tem endereço para mandar.
      return { ok: false, motivo: "dono_sem_email" };
    }
  }

  const contact = ctx.context.contact as ContatoDoContexto | undefined;
  if (!contact) return { ok: false, motivo: "no_contact" };
  if (contact.is_blocked) return { ok: false, motivo: "contact_blocked" };
  // Recusa registrada — não "grant ausente". Ver `guarda-do-contato.ts`.
  if (contact.consent?.marketing?.declined_at) return { ok: false, motivo: "consent_declined" };
  const email = emailValido(contact.email);
  return email ? { ok: true, endereco: email } : { ok: false, motivo: "no_email" };
}

/**
 * O CÓDIGO da falha que vai para a tela, um por vocabulário do provedor.
 *
 * Não é tradução: é o mapa que `MOTIVO_DA_PARADA` (aba Atividade) usa para
 * dar a frase. `not_configured` e `sender_rejected` mandam para lugares
 * diferentes (uma chave em branco, um remetente rejeitado), e achatar os dois
 * em "falhou" é o defeito que o roteador já pagou uma vez.
 */
function codigoDaFalha(erro: EmailDeliveryError | undefined): string {
  switch (erro) {
    case "not_configured":
      return "email_nao_configurado";
    case "rate_limited":
      return "email_limite_atingido";
    case "sender_rejected":
      return "remetente_recusado";
    case "dominio_nao_verificado":
      return "dominio_nao_verificado";
    default:
      return "email_recusado";
  }
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * O corpo nos DOIS formatos que a tela oferece.
 *
 * Em `texto`, o `<` digitado pelo operador é dado de quem escreve, não HTML —
 * escapar é o que impede `a < b` de virar tag quebrada no cliente de e-mail.
 * Em `html`, o corpo entra como está (é a promessa do formato) e a versão
 * `text` tira as tags: cliente sem HTML e leitor de tela comem a mesma frase.
 */
function corpoParaHtml(corpo: string, formato: string): string {
  if (formato === "html") return corpo;
  return escaparHtml(corpo).replace(/\n/g, "<br />\n");
}

function corpoParaTexto(corpo: string, formato: string): string {
  if (formato === "texto") return corpo;
  return corpo.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function execute(
  ctx: ActionCtx,
  config: Record<string, unknown>,
): Promise<ActionResultDetail> {
  const bruto = config.destinatario;
  const destinatario: Destinatario | null =
    bruto === "contato" || bruto === "dono_do_lead" || bruto === "fixo" ? bruto : null;
  const assunto = typeof config.assunto === "string" ? config.assunto.trim() : "";
  const corpo = typeof config.corpo === "string" ? config.corpo.trim() : "";
  const formato = config.formato === "html" ? "html" : "texto";
  const fixo = typeof config.email_fixo === "string" ? config.email_fixo.trim() : "";

  // Mesma recusa de `send-whatsapp.ts`: sem o essencial a regra não roda, e
  // dizer "failed silencioso" aqui deixaria quem opera procurando o transporte.
  if (!destinatario || !assunto || !corpo || (destinatario === "fixo" && !fixo)) {
    return { type: "send_email", status: "failed", error: "missing_config" };
  }

  const para = await resolverDestinatario(ctx, destinatario, fixo);
  if (!para.ok) {
    return { type: "send_email", status: "skipped", detail: { reason: para.motivo } };
  }

  const assuntoPronto = renderTemplate(assunto, ctx.context);
  const corpoPronto = renderTemplate(corpo, ctx.context);

  const resultado = await sendEmail({
    to: para.endereco,
    subject: assuntoPronto,
    html: corpoParaHtml(corpoPronto, formato),
    text: corpoParaTexto(corpoPronto, formato),
    // Mesma tag da cobrança, com o valor que diz de ONDE veio: no painel da
    // Resend dá para separar o envio de automação do convite de equipe.
    tags: [{ name: "origem", value: "automacao" }],
  });

  const base = { destinatario, via: resultado.via ?? null };
  if (!resultado.ok) {
    return {
      type: "send_email",
      status: "failed",
      error: codigoDaFalha(resultado.error),
      // A frase do provedor é detalhe TÉCNICO (aba Atividade mostra em corpo
      // menor): ela é em inglês e vem do provedor, não é o que quem opera lê
      // primeiro — por isso mora aqui e não no `error`.
      detail: { ...base, error: resultado.details ?? null },
    };
  }
  return {
    type: "send_email",
    status: "success",
    detail: { ...base, email_id: resultado.id ?? null },
  };
}

registerAction({ type: "send_email", execute });
