import { describe, it, expect } from "vitest";
import { normName, findCanonical } from "../utils/fuzzy.js";

const catalogo = [
  { nombre_bebe: "Axel Alejandro Espinosa Zapata", nombre_madre: "María García López" },
  { nombre_bebe: "Sofia Chourio Pérez",            nombre_madre: "Ana López Martínez" },
  { nombre_bebe: "Valentina Torres Díaz",          nombre_madre: "Carmen Díaz Ruiz" },
];

// ── normName ──────────────────────────────────────────────────────────────────

describe("normName", () => {
  it("convierte a minúsculas", () => {
    expect(normName("SOFIA")).toBe("sofia");
  });

  it("elimina tildes", () => {
    expect(normName("Sofía Chourío")).toBe("sofia chourio");
  });

  it("normaliza espacios múltiples", () => {
    expect(normName("  axel   espinosa  ")).toBe("axel espinosa");
  });

  it("maneja null sin explotar", () => {
    expect(normName(null)).toBe("");
  });

  it("maneja undefined sin explotar", () => {
    expect(normName(undefined)).toBe("");
  });

  it("maneja string vacío", () => {
    expect(normName("")).toBe("");
  });
});

// ── findCanonical ─────────────────────────────────────────────────────────────

describe("findCanonical — coincidencia exacta", () => {
  it("encuentra por coincidencia exacta post-normalización", () => {
    const result = findCanonical(
      "Axel Alejandro Espinosa Zapata",
      "María García López",
      catalogo
    );
    expect(result?.nombre_bebe).toBe("Axel Alejandro Espinosa Zapata");
  });

  it("encuentra ignorando tildes y mayúsculas", () => {
    const result = findCanonical("sofia chourio perez", "ana lopez martinez", catalogo);
    expect(result?.nombre_bebe).toBe("Sofia Chourio Pérez");
  });
});

describe("findCanonical — nombres abreviados (token overlap)", () => {
  it("resuelve nombre parcial del bebé cuando la madre coincide bien", () => {
    const result = findCanonical("axel espinosa", "maria garcia lopez", catalogo);
    expect(result?.nombre_bebe).toBe("Axel Alejandro Espinosa Zapata");
  });

  it("resuelve nombre parcial de la madre cuando el bebé coincide bien", () => {
    const result = findCanonical("Valentina Torres Díaz", "carmen diaz", catalogo);
    expect(result?.nombre_bebe).toBe("Valentina Torres Díaz");
  });
});

describe("findCanonical — typos (Levenshtein)", () => {
  it("corrige typo menor en nombre del bebé", () => {
    // "Churio" vs "Chourio" — 1 edit, Levenshtein score ≈ 0.947 con nombre completo
    const result = findCanonical("Sofia Churio Perez", "Ana Lopez Martinez", catalogo);
    expect(result?.nombre_bebe).toBe("Sofia Chourio Pérez");
  });

  it("corrige typo menor en nombre de la madre", () => {
    const result = findCanonical("Axel Alejandro Espinosa Zapata", "Maria Gracia Lopez", catalogo);
    expect(result?.nombre_bebe).toBe("Axel Alejandro Espinosa Zapata");
  });
});

describe("findCanonical — sin match", () => {
  it("devuelve null cuando el bebé no existe en el catálogo", () => {
    const result = findCanonical("Pedro Ramírez", "Luisa Fernández", catalogo);
    expect(result).toBeNull();
  });

  it("devuelve null cuando el bebé coincide pero la madre es muy distinta", () => {
    // Axel existe pero la madre es completamente diferente → no debe matchear
    const result = findCanonical("Axel Espinosa", "Fernanda Zambrano Castro", catalogo);
    expect(result).toBeNull();
  });

  it("devuelve null con catálogo vacío", () => {
    const result = findCanonical("Sofia", "Ana", []);
    expect(result).toBeNull();
  });
});
