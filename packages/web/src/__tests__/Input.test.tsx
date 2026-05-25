import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Input } from "@/components/ui/Input.js";

describe("Input", () => {
  it("renderiza sin label", () => {
    render(<Input placeholder="Escribe aquí" />);
    expect(screen.getByPlaceholderText("Escribe aquí")).toBeInTheDocument();
  });

  it("renderiza con label asociado al input", () => {
    render(<Input label="Nombre" />);
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });

  it("muestra mensaje de error", () => {
    render(<Input label="Email" error="Email inválido" />);
    expect(screen.getByText("Email inválido")).toBeInTheDocument();
  });

  it("aplica clases de error al input cuando hay error", () => {
    render(<Input label="Email" error="Requerido" />);
    expect(screen.getByLabelText("Email")).toHaveClass("border-red-400");
  });

  it("muestra hint cuando no hay error", () => {
    render(<Input label="Email" hint="Usa tu correo institucional" />);
    expect(screen.getByText("Usa tu correo institucional")).toBeInTheDocument();
  });

  it("NO muestra hint cuando hay error", () => {
    render(<Input label="Email" error="Error" hint="Hint que no debe verse" />);
    expect(screen.queryByText("Hint que no debe verse")).not.toBeInTheDocument();
  });

  it("llama onChange al escribir", async () => {
    const handler = vi.fn();
    render(<Input label="Campo" onChange={handler} />);
    await userEvent.type(screen.getByLabelText("Campo"), "hola");
    expect(handler).toHaveBeenCalled();
  });

  it("respeta el valor controlado", () => {
    render(<Input label="Campo" value="prefijado" readOnly />);
    expect(screen.getByLabelText("Campo")).toHaveValue("prefijado");
  });
});
