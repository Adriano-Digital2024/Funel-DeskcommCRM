/**
 * A ação `send_email` (#2726) NO EDITOR DE REGRAS — a perna da tela.
 *
 * O que este arquivo prova:
 *
 *   1. `labels.ts` nomeia a ação (sem isso, uma regra criada pela API aparece
 *      no RuleEditor com o título em branco — e é de `Object.keys(ACTION_LABELS)`
 *      que o seletor de "ENTÃO" monta as opções);
 *   2. `defaultActionConfig` nasce com a MESMA forma que o schema exige;
 *   3. `ActionConfigForm` TEM o caso: o rótulo do destinatário renderiza, e
 *      escolher "Endereço fixo" revela o campo do endereço;
 *   4. o que a pessoa escreve chega na regra pelo `onChange`.
 *
 * A execução (destinatário e variáveis resolvidos, falha com motivo) vive em
 * `lib/automation/actions/send-email.test.ts`.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() },
}));

import { ACTION_LABELS, type ActionType } from "@/app/app/webhooks/_components/labels";
import { apiClient } from "@/lib/api/client";
import {
  ActionConfigForm,
  defaultActionConfig,
  type ActionItem,
} from "@/app/app/webhooks/_components/ActionConfigForm";

afterEach(() => cleanup());
afterAll(() => vi.restoreAllMocks());

// jsdom não implementa captura de ponteiro; o gatilho do Select do Radix lê
// `hasPointerCapture` antes de abrir — sem isto, abrir morre em TypeError.
beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => undefined;
  proto.releasePointerCapture ??= () => undefined;
  proto.scrollIntoView ??= () => undefined;
});

/**
 * O formulário é CONTROLADO: ele lê `action` e avisa `onChange`, e é o
 * editor (o componente pai) que guarda o estado. Aqui a gente repete o papel
 * do pai — `setAtual` — senão escolher "Endereço fixo" só avisa e não revela
 * campo nenhum, o que NÃO é defeito do formulário.
 */
function montar(action: ActionItem, onChange = vi.fn()) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Pai({ inicial }: { inicial: ActionItem }) {
    const [atual, setAtual] = React.useState(inicial);
    return (
      <QueryClientProvider client={cliente}>
        <ActionConfigForm
          action={atual}
          onChange={(next) => {
            setAtual(next);
            onChange(next);
          }}
        />
      </QueryClientProvider>
    );
  }
  const utils = render(<Pai inicial={action} />);
  return { ...utils, onChange };
}

describe("labels.ts nomeia send_email", () => {
  it("está no ACTION_LABELS e no ActionType, com frase própria", () => {
    const tipos = Object.keys(ACTION_LABELS) as ActionType[];
    expect(tipos).toContain("send_email");
    expect(ACTION_LABELS.send_email).toMatch(/e-mail/i);
  });
});

describe("ActionConfigForm: o formulário do e-mail", () => {
  beforeEach(() => vi.mocked(apiClient.get).mockReset());

  it("defaultActionConfig nasce com a mesma forma que o schema exige", () => {
    expect(defaultActionConfig("send_email")).toEqual({
      type: "send_email",
      config: { destinatario: "contato", email_fixo: "", assunto: "", corpo: "", formato: "texto" },
    });
  });

  it("renderiza destinatário, assunto e corpo", () => {
    montar(defaultActionConfig("send_email"));
    expect(screen.getByText("Destinatário")).toBeInTheDocument();
    expect(screen.getByText("Assunto")).toBeInTheDocument();
    expect(screen.getByText("Corpo do e-mail")).toBeInTheDocument();
    // O aviso de POR ONDE sai é o que impede a pessoa de procurar uma
    // credencial nova: o envio usa o e-mail que já está configurado.
    expect(
      screen.getByText(/e-mail configurado em Admin/i),
    ).toBeInTheDocument();
  });

  it("escolher Endereço fixo revela o campo do endereço", () => {
    const { container, onChange } = montar(defaultActionConfig("send_email"));
    const gatilho = container.querySelector("button");
    expect(gatilho, "o seletor do destinatário não renderizou gatilho").not.toBeNull();

    fireEvent.click(gatilho!);
    fireEvent.click(screen.getByText("Endereço fixo"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: "send_email", config: expect.objectContaining({ destinatario: "fixo" }) }),
    );
    expect(screen.getByText("Endereço de e-mail")).toBeInTheDocument();
  });

  it("o que a pessoa escreve no assunto chega na regra", () => {
    const { onChange } = montar(defaultActionConfig("send_email"));
    const assunto = screen.getByPlaceholderText("Sua viagem para {{destino}}");
    fireEvent.change(assunto, { target: { value: "Seu voucher" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ assunto: "Seu voucher" }) }),
    );
  });
});
