interface EntradaCatalogo {
  nombre_bebe: string;
  nombre_madre: string;
}

export function normName(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshteinSim(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      // dp[i] y dp[i-1] siempre existen por construcción del array
      const row = dp[i]!;
      const prevRow = dp[i - 1]!;
      row[j] =
        a[i - 1] === b[j - 1]
          ? prevRow[j - 1]!
          : 1 + Math.min(prevRow[j]!, row[j - 1]!, prevRow[j - 1]!);
    }
  }
  return 1 - dp[m]![n]! / Math.max(m, n);
}

function tokenOverlap(input: string, canonical: string): number {
  const it = normName(input).split(" ").filter(Boolean);
  const ct = new Set(normName(canonical).split(" ").filter(Boolean));
  if (!it.length) return 0;
  return it.filter((t) => ct.has(t)).length / it.length;
}

export function findCanonical(
  nombre_bebe: string,
  nombre_madre: string,
  catalogo: EntradaCatalogo[]
): EntradaCatalogo | null {
  const nb = normName(nombre_bebe);
  const nm = normName(nombre_madre);

  for (const b of catalogo) {
    if (normName(b.nombre_bebe) === nb && normName(b.nombre_madre) === nm) {
      return b;
    }
  }

  let best: EntradaCatalogo | null = null;
  let bestScore = 0;

  for (const b of catalogo) {
    const cb = normName(b.nombre_bebe);
    const cm = normName(b.nombre_madre);
    const bebeScore = Math.max(tokenOverlap(nb, cb), levenshteinSim(nb, cb));
    const madreScore = Math.max(tokenOverlap(nm, cm), levenshteinSim(nm, cm));

    if (bebeScore >= 0.75 && madreScore >= 0.65) {
      const score = bebeScore * madreScore;
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
  }

  return best;
}
