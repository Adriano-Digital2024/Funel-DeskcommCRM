"use client";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PreviaDaDefinicao } from "./PreviaDaDefinicao";
import {
  useCreateMetaTemplate,
  useSyncTemplates,
  useTemplates,
  type TemplatePreview,
} from "@/hooks/channels/useTemplates";
import {
  contarVariaveis,
  IDIOMAS_DA_DEFINICAO,
  LIMITE_BOTOES,
  LIMITE_CORPO,
  LIMITE_RODAPE,
  montarComponents,
  type BotaoDaDefinicao,
} from "@/lib/channels/template-conteudo";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/i18n/useT";

/** Só APPROVED pode ser disparado — o resto é informação, não opção. */
function statusTone(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default";
  if (status === "REJECTED" || status === "DISABLED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "outline";
}

function Preview({ preview }: { preview: TemplatePreview }) {
  const t = useT();
  const partes = preview.text.split(/(\{\{\w+\}\})/g);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {t(preview.onde)}
      </span>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {partes.map((parte, i) =>
          /^\{\{\w+\}\}$/.test(parte) ? (
            <span
              key={i}
              className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-medium text-primary ring-1 ring-primary/20"
            >
              {parte.slice(2, -2)}
            </span>
          ) : (
            <span key={i} className="text-muted-foreground">
              {parte}
            </span>
          ),
        )}
      </p>
    </div>
  );
}

export function TemplatesClient() {
  const t = useT();
  const { data, isPending } = useTemplates();
  const sync = useSyncTemplates();
  const criar = useCreateMetaTemplate();

  const waba = data?.data.waba ?? null;
  const templates = data?.data.templates ?? null;

  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [idioma, setIdioma] = useState("pt_BR");
  const [categoria, setCategoria] = useState("UTILITY");
  const [corpo, setCorpo] = useState("");
  const [rodape, setRodape] = useState("");
  const [exemplos, setExemplos] = useState<string[]>([]);
  const [cabecalho, setCabecalho] = useState("");
  const [midiaUrl, setMidiaUrl] = useState("");
  const [botoes, setBotoes] = useState<BotaoDaDefinicao[]>([]);
  const [subindo, setSubindo] = useState(false);

  const nVariaveis = contarVariaveis(corpo);

  async function sincronizar() {
    const res = await sync.mutateAsync();
    const { inserted, updated, disabled } = res.data;
    toast.success(
      `${t("Sincronizado:")} ${inserted} ${t("novo(s),")} ${updated} ${t("atualizado(s),")} ${disabled} ${t("desativado(s).")}`,
    );
  }

  if (isPending || templates === null) {
    return <p className="text-sm text-muted-foreground">{t("Carregando…")}</p>;
  }

  if (!waba) {
    return (
      <Card className="p-6">
        <h2 className="font-medium">{t("Canal oficial não conectado")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Os templates vivem na sua conta do WhatsApp Business (Meta) — esta tela é um espelho deles. Conecte o canal oficial em")}{" "}
          <strong>{t("Conexões WhatsApp")}</strong> {t("para começar a sincronizar.")}
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="templates-root">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t("Espelho da conta")} <span className="font-mono text-xs">{waba}</span> ·{" "}
          {templates.length} {t("template(s)")}
        </p>
        <div className="flex gap-2">
          <Button onClick={sincronizar} disabled={sync.isPending} variant="outline" size="sm" data-testid="btn-sync">
            {sync.isPending ? t("Sincronizando…") : t("Sincronizar com a Meta")}
          </Button>
          <Button type="button" size="sm" onClick={() => setCriando((v) => !v)}>
            {criando ? t("Cancelar") : t("Criar modelo")}
          </Button>
        </div>
      </div>

      {criando && (
        <div className="grid gap-4 rounded-md border border-border p-3 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="nome_do_modelo"
                aria-label={t("Nome do modelo")}
                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              />
              <select
                value={idioma}
                onChange={(e) => setIdioma(e.target.value)}
                aria-label={t("Idioma")}
                className="h-9 w-56 rounded-md border border-input bg-background px-2 text-sm"
              >
                {IDIOMAS_DA_DEFINICAO.map((i) => (
                  <option key={i.codigo} value={i.codigo}>
                    {t(i.rotulo)} ({i.codigo})
                  </option>
                ))}
              </select>
            </div>

            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              aria-label={t("Categoria")}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="UTILITY">
                {t("Utilidade — aviso de pedido, agendamento, cobrança")}
              </option>
              <option value="MARKETING">{t("Marketing — promoção, novidade, reengajamento")}</option>
              <option value="AUTHENTICATION">{t("Autenticação — código de verificação")}</option>
            </select>

            <div className="flex flex-wrap gap-2">
              <input
                value={cabecalho}
                onChange={(e) => {
                  setCabecalho(e.target.value);
                  if (e.target.value) setMidiaUrl("");
                }}
                placeholder={t("Cabeçalho de texto (opcional)")}
                aria-label={t("Cabeçalho de texto")}
                disabled={!!midiaUrl}
                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
              />
              <label
                className={cn(
                  "flex h-9 flex-1 cursor-pointer items-center justify-center rounded-md border border-dashed border-input px-2 text-sm text-muted-foreground hover:bg-muted",
                  cabecalho && "pointer-events-none opacity-50",
                )}
              >
                {subindo
                  ? t("Subindo…")
                  : midiaUrl
                    ? t("Trocar imagem")
                    : t("Subir imagem (JPG/PNG)")}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  aria-label={t("Imagem do cabeçalho")}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setSubindo(true);
                    try {
                      const fd = new FormData();
                      fd.append("file", f);
                      const r = await fetch("/api/v1/channels/partner/templates/media", {
                        method: "POST",
                        body: fd,
                      });
                      const j = (await r.json()) as { data?: { url?: string }; error?: { message?: string } };
                      if (!r.ok || !j.data?.url) {
                        toast.error(t(j.error?.message ?? "Não consegui subir a imagem."));
                        return;
                      }
                      setMidiaUrl(j.data.url);
                      setCabecalho("");
                    } finally {
                      setSubindo(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <textarea
                value={corpo}
                onChange={(e) => setCorpo(e.target.value.slice(0, LIMITE_CORPO))}
                placeholder={t("Texto da mensagem. Use {{1}}, {{2}} para os valores que mudam.")}
                aria-label={t("Conteúdo")}
                className="min-h-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
              <span className="self-end text-[10px] text-muted-foreground">
                {corpo.length}/{LIMITE_CORPO}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <input
                value={rodape}
                onChange={(e) => setRodape(e.target.value.slice(0, LIMITE_RODAPE))}
                placeholder={t("Rodapé (opcional) — texto pequeno no fim da mensagem")}
                aria-label={t("Rodapé")}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
              <span className="self-end text-[10px] text-muted-foreground">
                {rodape.length}/{LIMITE_RODAPE}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {botoes.map((b, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    value={b.tipo}
                    onChange={(e) => {
                      const p = [...botoes];
                      p[i] = { ...b, tipo: e.target.value as BotaoDaDefinicao["tipo"] };
                      setBotoes(p);
                    }}
                    aria-label={`${t("Tipo do botão")} ${i + 1}`}
                    className="h-8 w-40 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="quick_reply">{t("Resposta rápida")}</option>
                    <option value="url">{t("Abrir link")}</option>
                    <option value="phone_number">Ligar</option>
                  </select>
                  <input
                    value={b.texto}
                    onChange={(e) => {
                      const p = [...botoes];
                      p[i] = { ...b, texto: e.target.value };
                      setBotoes(p);
                    }}
                    placeholder={t("Texto do botão")}
                    aria-label={`${t("Texto do botão")} ${i + 1}`}
                    className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  />
                  {b.tipo === "url" && (
                    <input
                      value={b.url ?? ""}
                      onChange={(e) => {
                        const p = [...botoes];
                        p[i] = { ...b, url: e.target.value };
                        setBotoes(p);
                      }}
                      placeholder="https://…"
                      aria-label={`${t("URL do botão")} ${i + 1}`}
                      className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    />
                  )}
                  {b.tipo === "phone_number" && (
                    <input
                      value={b.telefone ?? ""}
                      onChange={(e) => {
                        const p = [...botoes];
                        p[i] = { ...b, telefone: e.target.value };
                        setBotoes(p);
                      }}
                      placeholder="+55…"
                      aria-label={`${t("Telefone do botão")} ${i + 1}`}
                      className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setBotoes(botoes.filter((_, j) => j !== i))}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    aria-label={`${t("Remover botão")} ${i + 1}`}
                  >
                    {t("remover")}
                  </button>
                </div>
              ))}
              {botoes.length < LIMITE_BOTOES && (
                <button
                  type="button"
                  onClick={() => setBotoes([...botoes, { tipo: "quick_reply", texto: "" }])}
                  className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  + {t("Adicionar botão")} ({botoes.length}/{LIMITE_BOTOES})
                </button>
              )}
            </div>

            {nVariaveis > 0 && (
              <div className="flex flex-col gap-1.5 rounded-md border border-amber-300 bg-amber-50/50 p-2 dark:border-amber-800/60 dark:bg-amber-950/20">
                <p className="text-[11px] text-amber-900 dark:text-amber-200">
                  {t("A revisão exige um exemplo de cada valor. Sem eles o modelo é recusado.")}
                </p>
                {Array.from({ length: nVariaveis }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                      {`{{${i + 1}}}`}
                    </span>
                    <input
                      value={exemplos[i] ?? ""}
                      onChange={(e) => {
                        const proximo = [...exemplos];
                        proximo[i] = e.target.value;
                        setExemplos(proximo);
                      }}
                      placeholder={t("ex.: Maria")}
                      aria-label={`${t("Exemplo do valor")} ${i + 1}`}
                      className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              {t(
                "A plataforma revisa antes de aprovar — o modelo nasce pendente e some da lista de envio até ela decidir.",
              )}
            </p>
            <div className="flex sm:justify-end">
              <Button
                type="button"
                size="sm"
                disabled={!nome.trim() || !corpo.trim() || criar.isPending}
                onClick={() =>
                  criar.mutate(
                    {
                      name: nome.trim(),
                      language: idioma.trim(),
                      category: categoria,
                      components: montarComponents({
                        body: corpo,
                        footer: rodape,
                        exemplos,
                        cabecalho: { texto: cabecalho, midiaUrl },
                        botoes,
                      }),
                    },
                    {
                      onSuccess: () => {
                        toast.success(t("Modelo enviado para revisão da Meta!"));
                        setCriando(false);
                        setNome("");
                        setCorpo("");
                        setRodape("");
                        setCabecalho("");
                        setMidiaUrl("");
                        setBotoes([]);
                        setExemplos([]);
                      },
                    },
                  )
                }
                className="w-full sm:w-auto"
              >
                {criar.isPending ? t("Enviando…") : t("Enviar para revisão")}
              </Button>
            </div>
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            <PreviaDaDefinicao
              cabecalho={cabecalho}
              midiaUrl={midiaUrl}
              corpo={corpo}
              rodape={rodape}
              botoes={botoes}
            />
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <Card className="p-6">
          <h2 className="font-medium">{t("Nenhum template ainda")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Clique em")} <strong>{t("Criar modelo")}</strong>{" "}
            {t("para enviar uma definição para aprovação da Meta, ou em")}{" "}
            <strong>{t("Sincronizar com a Meta")}</strong>{" "}
            {t("para trazer os que já existem na plataforma.")}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((tpl) => (
            <Card key={`${tpl.name}:${tpl.language}`} className="p-4" data-testid="template-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{tpl.name}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {tpl.language}
                </Badge>
                <Badge variant={statusTone(tpl.status)}>{tpl.status}</Badge>
                {tpl.category ? (
                  <Badge variant="outline" className="text-xs">
                    {tpl.category}
                  </Badge>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {tpl.slots.length === 0
                    ? t("sem parâmetros")
                    : `${tpl.slots.length} ${t("parâmetro(s)")}`}
                </span>
              </div>

              {tpl.rejectedReason ? (
                <p className="mt-2 text-sm text-destructive">
                  {t("Recusado:")} {tpl.rejectedReason}
                </p>
              ) : null}

              {tpl.previews.length > 0 || tpl.slots.length > 0 ? (
                <div className="mt-3 flex flex-col gap-3 border-l-2 border-muted pl-3">
                  {tpl.previews.map((p, i) => (
                    <Preview key={`${p.onde}:${i}`} preview={p} />
                  ))}
                  {tpl.slots
                    .filter((s) => s.expects !== "text")
                    .map((s, i) => (
                      <div key={`m:${s.onde}:${i}`} className="flex flex-col gap-0.5">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t(s.onde)} · {s.expects}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {t("arquivo de")} {s.expects} {t("enviado no disparo")}
                        </span>
                      </div>
                    ))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
