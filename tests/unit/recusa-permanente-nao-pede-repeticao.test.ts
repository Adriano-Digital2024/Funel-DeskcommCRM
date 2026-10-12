import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * RECUSA PERMANENTE NÃO SAI COM `40001`.
 *
 * `40001` é serialization_failure: "tente de novo". O PostgREST 14 acredita e
 * refaz a transação sozinho, sem limite. Numa recusa que nunca vai passar
 * (revisão velha, claim vencido, estado que não volta), isso vira um laço que
 * derruba a instalação inteira — medido numa VPS self-hosted no #2805, e
 * reproduzido na triagem com `postgrest/postgrest:v14.17`: UM POST, mais de 55
 * mil execuções em 3 s. A saída é `PT409` (migrations 0363, 0514, 0654).
 *
 * A cerca lê a ÚLTIMA definição de cada função — no baseline (o que o kit
 * self-host aplica) e na cadeia de migrations — e reprova todo
 * `raise exception '<x>' ... errcode='40001'` cujo `<x>` não esteja na lista
 * de conflitos em que REPETIR é a resposta certa. Recusa nova com `40001` tem
 * de entrar nesta lista com o porquê, ou sair com `PT409`.
 */
const REPETIR_PASSA = new Map<string, string>([
  ["service_contact_changed", "o contato mudou entre a leitura e o lock; a nova tentativa relê e passa"],
  ["appointment_notice_busy", "trava do aviso do Meet ocupada por outra escrita"],
  ["contact_redaction_busy", "trava da anonimização ocupada por outra escrita"],
]);

const RAIZ = join(__dirname, "..", "..", "supabase");
const BASELINE = readFileSync(join(RAIZ, "baseline.sql"), "utf8");
const CADEIA = readdirSync(join(RAIZ, "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(RAIZ, "migrations", f), "utf8"))
  .join("\n");

type Recusa = { funcao: string; mensagem: string; errcode: string };

/** Recusas da ÚLTIMA definição de cada função (chave: nome + aridade). */
function recusasVigentes(sql: string): Recusa[] {
  const ultima = new Map<string, string>();
  const cabecalho = /create\s+(?:or\s+replace\s+)?function\s+(?:"?public"?\.)?"?(\w+)"?\s*\(/gi;
  for (const m of sql.matchAll(cabecalho)) {
    let i = m.index + m[0].length;
    let profundidade = 1;
    let virgulas = 0;
    const inicioArgs = i;
    while (profundidade > 0 && i < sql.length) {
      const c = sql[i++];
      if (c === "(") profundidade++;
      else if (c === ")") profundidade--;
      else if (c === "," && profundidade === 1) virgulas++;
    }
    const aridade = sql.slice(inicioArgs, i - 1).trim() === "" ? 0 : virgulas + 1;
    // O delimitador é lido do texto (`$$`, `$fn$`…), nunca `end $$;` fixo: o pg_dump escreve em maiúsculas.
    const abertura = /\$(\w*)\$/.exec(sql.slice(i));
    if (!abertura) continue;
    const inicioCorpo = i + abertura.index + abertura[0].length;
    const fim = sql.indexOf(abertura[0], inicioCorpo);
    if (fim < 0) continue;
    ultima.set(`${m[1].toLowerCase()}/${aridade}`, sql.slice(inicioCorpo, fim));
  }
  const recusas: Recusa[] = [];
  for (const [chave, corpo] of ultima) {
    for (const r of corpo.matchAll(/raise\s+exception\s+'([^']+)'[^;]*?errcode\s*=\s*'(\w+)'/gi)) {
      recusas.push({ funcao: chave.split("/")[0], mensagem: r[1], errcode: r[2].toUpperCase() });
    }
  }
  return recusas;
}

describe.each([
  ["baseline.sql", BASELINE],
  ["cadeia de migrations", CADEIA],
])("recusa permanente não pede repetição — %s", (_nome, sql) => {
  const recusas = recusasVigentes(sql);

  it("nenhuma recusa permanente sai com 40001", () => {
    const pedemRepeticao = recusas
      .filter((r) => r.errcode === "40001" && !REPETIR_PASSA.has(r.mensagem))
      .map((r) => `${r.funcao}: ${r.mensagem}`);
    expect(pedemRepeticao).toEqual([]);
  });

  it("a sonda enxerga os dois lados (não está cega)", () => {
    // Se o parser parar de achar corpos, o teste acima fica verde por vazio.
    expect(recusas.some((r) => r.funcao === "fn_service_status" && r.mensagem === "service_contact_changed" && r.errcode === "40001")).toBe(true);
    expect(recusas.some((r) => r.funcao === "fn_service_event_origin" && r.mensagem === "service_stale" && r.errcode === "PT409")).toBe(true);
  });
});
