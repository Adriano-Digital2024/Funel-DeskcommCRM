import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * O item 4 do #290: a regra escrita no cabeçalho de `lib/channels/zernio/envelope.ts`
 * não era a regra que o schema aplica.
 *
 * O cabeçalho afirmava "um campo ganha tipo quando o código o consome SEM guarda
 * própria" — e NENHUM leitor deste canal consome o envelope sem guarda: todos
 * recebem `unknown` e normalizam com `str()`/`obj()`/`Array.isArray`
 * (`./webhook.ts`, `./avisos.ts`, `./ingest.ts`). Ainda assim, o schema tipa
 * quase todo campo. A regra foi reescrita para descrever o que o schema FAZ:
 * tipa o campo que o leitor normaliza — porque o tipo errado ali vira silêncio
 * (ver o topo do arquivo) — e deixa sem tipo só o que o leitor aceita em
 * qualquer forma, que hoje é `attachments`.
 *
 * Este teste existe para a regra declarada e o schema executado não voltarem a
 * divergir em silêncio: ele confere, no CÓDIGO, quais campos o schema deixa sem
 * tipo e exige que o cabeçalho os declare na LINHA MARCADA. Não é teste de prosa
 * — é a costura entre a regra e o schema.
 */

const FONTE = readFileSync("lib/channels/zernio/envelope.ts", "utf8");

/** Campos que o schema deixa `z.unknown()` — os que o leitor aceita em qualquer forma. */
function camposSemTipo(): string[] {
  const nomes: string[] = [];
  for (const linha of FONTE.split("\n")) {
    const m = /^\s*([A-Za-z_]\w*):\s*z\.unknown\(\)/.exec(linha);
    if (m) nomes.push(m[1]!);
  }
  return nomes.sort();
}

/**
 * Os campos que o CABEÇALHO declara sem tipo — lidos da linha marcada, para a
 * declaração ser máquina-conferível em vez de prosa solta.
 */
function declaradosSemTipo(): string[] | null {
  const m = /Sem tipo \(o leitor aceita qualquer forma\):\s*([^\n]*)/.exec(FONTE);
  if (!m) return null;
  return [...m[1]!.matchAll(/`([^`]+)`/g)].map((x) => x[1]!).sort();
}

describe("a regra do cabeçalho descreve o schema do envelope zernio (item 4 do #290)", () => {
  it("o schema deixa sem tipo exatamente um campo — `attachments`", () => {
    expect(camposSemTipo()).toEqual(["attachments"]);
  });

  it("o cabeçalho DECLARA esse mesmo conjunto na linha marcada", () => {
    // Antes do conserto o cabeçalho não tinha linha assim nenhuma: ele afirmava
    // uma regra que o schema não seguia. `null` aqui é o defeito, não borda.
    expect(declaradosSemTipo()).toEqual(camposSemTipo());
  });

  it("o cabeçalho não repete a regra falsificada", () => {
    // "ganha tipo quando o código o consome sem guarda própria" é FALSO aqui:
    // todo leitor passa pelo `str()`/`obj()`. A frase é cópia do modelo dos
    // outros canais e é exatamente o que o item 4 mandou decidir.
    expect(FONTE).not.toContain("sem guarda própria");
  });
});
