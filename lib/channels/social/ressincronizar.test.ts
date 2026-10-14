/**
 * `ressincronizarAssinaturaSocial` — a ação "Ressincronizar webhook" do canal
 * social (issue #2863).
 *
 * ## O defeito medido
 *
 * Trocar o domínio da instalação deixava a assinatura de webhook do Zernio
 * apontando para o domínio ANTIGO, e os canais seguiam `WORKING`. Não havia
 * caminho pela tela: `connectSocialInbox` devolve `already_connected` para quem
 * já tem `social_webhook_id`, e "Desconectar" ARQUIVA a linha (canal novo,
 * agentes publicados desligados).
 *
 * ## O que este arquivo prova
 *
 * 1. Assinatura com origem ANTIGA: a ação regrava a URL com a origem ATUAL,
 *    mantendo o caminho (token) e casando pelo SUFIXO — nada de canal novo e
 *    `channel_sessions` intacta (nenhum UPDATE).
 * 2. Assinatura já na origem atual: no-op — nenhum PUT no provedor.
 * 3. Sem assinatura para o token desta linha: recusa nomeando o motivo, sem
 *    tocar o provedor.
 *
 * O provedor é DUBLADO — nada de rede de verdade nesta suíte.
 */
import { beforeEach, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/webhooks/secrets", () => ({
  decryptWebhookSecret: async () => "provider-key",
  encryptWebhookSecret: async () => "enc",
}));
vi.mock("@/lib/channels/health", () => ({ resolverSaudeDaConexaoRemovida: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("../zernio/credentials", () => ({ zernioBaseUrl: () => "https://zernio.test" }));

import { ressincronizarAssinaturaSocial } from "./store";

const ORG = "org-1";
const CONTA = "a".repeat(24);
const TOKEN = "b".repeat(48);
const CAMINHO = `/api/v1/webhooks/channel/${TOKEN}`;
const ORIGEM_ATUAL = "https://novo.exemplo.com";
const ORIGEM_ANTIGA = "https://antigo.exemplo.com";

type Update = { patch: Record<string, unknown>; filters: Record<string, unknown> };
function fakeDb(canais: Record<string, unknown>[], token: string = TOKEN) {
  const updates: Update[] = [];
  const db = {
    from(tabela: string) {
      const filters: Record<string, unknown> = {};
      let patch: Record<string, unknown> | null = null;
      let campos = "";
      const q = {
        select: (c?: string) => ((campos = c ?? ""), q),
        update: (p: Record<string, unknown>) => ((patch = p), q),
        eq: (k: string, v: unknown) => ((filters[k] = v), q),
        is: (k: string, v: unknown) => ((filters[k] = v), q),
        maybeSingle: async () => {
          if (tabela === "channel_integrations")
            return { data: { profile_id: "p", credential_encrypted: "x" }, error: null };
          if (campos === "webhook_path_token") return { data: { webhook_path_token: token }, error: null };
          return { data: null, error: null };
        },
        then: (resolve: (r: unknown) => void) => {
          if (patch) {
            updates.push({ patch, filters: { ...filters } });
            resolve({ data: null, error: null });
            return;
          }
          resolve({ data: tabela === "channel_sessions" ? canais : null, error: null });
        },
      };
      return q;
    },
  };
  return { db: db as never, updates };
}

const canal = {
  id: "ch-1",
  zernio_account_id: CONTA,
  display_name: "Instagram · brand",
  status: "WORKING",
  metadata: { social_webhook_id: "wh-1" },
  updated_at: "2026-10-05T00:00:00Z",
};

function provedor(assinaturas: Array<{ _id: string; url: string }>, status: Record<string, number> = {}) {
  h.fetch.mockImplementation(async (url: string, init: RequestInit) => {
    const key = `${init.method} ${String(url).replace("https://zernio.test/v1/", "")}`;
    if (status[key]) return new Response("{}", { status: status[key] });
    if (key === "GET webhooks/settings")
      return new Response(JSON.stringify({ webhooks: assinaturas }));
    return new Response("{}", { status: 200 });
  });
}

const puts = () =>
  h.fetch.mock.calls
    .filter(([, init]) => (init as RequestInit).method === "PUT")
    .map(([url, init]) => ({
      url: String(url).replace("https://zernio.test/v1/", ""),
      body: JSON.parse((init as RequestInit).body as string) as Record<string, unknown>,
    }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", h.fetch);
});

it("origem antiga: regrava a URL com a atual e mantém o caminho, sem tocar o canal", async () => {
  provedor([{ _id: "wh-1", url: `${ORIGEM_ANTIGA}${CAMINHO}` }]);
  const { db, updates } = fakeDb([canal]);

  const resultado = await ressincronizarAssinaturaSocial(db, ORG, CONTA, ORIGEM_ATUAL);

  expect(resultado).toEqual({
    channel_id: "ch-1",
    resynced: true,
    url: `${ORIGEM_ATUAL}${CAMINHO}`,
  });
  // Grava pela id, mudando SÓ a URL — segredo/eventos/nome ficam no provedor.
  expect(puts()).toEqual([
    { url: "webhooks/settings", body: { webhookId: "wh-1", url: `${ORIGEM_ATUAL}${CAMINHO}` } },
  ]);
  // Nada de canal novo nem de arquivamento: a linha de channel_sessions não é escrita.
  expect(updates).toHaveLength(0);
});

it("origem já atual: no-op — nenhum PUT no provedor", async () => {
  provedor([{ _id: "wh-1", url: `${ORIGEM_ATUAL}${CAMINHO}` }]);
  const { db, updates } = fakeDb([canal]);

  const resultado = await ressincronizarAssinaturaSocial(db, ORG, CONTA, ORIGEM_ATUAL);

  expect(resultado).toEqual({
    channel_id: "ch-1",
    resynced: false,
    url: `${ORIGEM_ATUAL}${CAMINHO}`,
  });
  expect(puts()).toEqual([]);
  expect(updates).toHaveLength(0);
});

it("assinatura de OUTRO token não casa: recusa, sem PUT", async () => {
  provedor([{ _id: "wh-outro", url: `${ORIGEM_ANTIGA}/api/v1/webhooks/channel/${"c".repeat(48)}` }]);
  const { db } = fakeDb([canal]);

  await expect(
    ressincronizarAssinaturaSocial(db, ORG, CONTA, ORIGEM_ATUAL),
  ).rejects.toThrow("Não há assinatura de webhook para ressincronizar.");
  expect(puts()).toEqual([]);
});

it("provedor fora do ar no PUT: lança, para o chamador decidir", async () => {
  provedor([{ _id: "wh-1", url: `${ORIGEM_ANTIGA}${CAMINHO}` }], { "PUT webhooks/settings": 500 });
  const { db } = fakeDb([canal]);

  await expect(
    ressincronizarAssinaturaSocial(db, ORG, CONTA, ORIGEM_ATUAL),
  ).rejects.toThrow("O provedor não concluiu a operação (HTTP 500).");
});
