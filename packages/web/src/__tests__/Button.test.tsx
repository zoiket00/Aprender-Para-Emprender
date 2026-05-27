import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/Button.js";

describe("Button", () => {
  it("renderiza el label correctamente", () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("aplica la variante primary por defecto", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-brand-500");
  });

  it("muestra spinner cuando loading=true", () => {
    render(<Button loading>Cargando</Button>);
    expect(screen.getByRole("button").querySelector("svg")).toBeTruthy();
  });

  it("está deshabilitado cuando loading=true", () => {
    render(<Button loading>Cargando</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("está deshabilitado cuando disabled=true", () => {
    render(<Button disabled>Acción</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("llama al onClick cuando no está deshabilitado", async () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("NO llama al onClick cuando está deshabilitado", async () => {
    const handler = vi.fn();
    render(<Button disabled onClick={handler}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("aplica variante danger con clase correcta", () => {
    render(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-red-600");
  });

  it("aplica className adicional sin romper las clases base", () => {
    render(<Button className="w-full">Completo</Button>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
    expect(screen.getByRole("button")).toHaveClass("bg-brand-500");
  });
});
