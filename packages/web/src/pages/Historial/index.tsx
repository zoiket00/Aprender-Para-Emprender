import { useState } from "react";
import { useAsistenciaFechas, useAsistencia, useEliminarDia } from "@/hooks/useAsistencia.js";
import { api } from "@/lib/api.js";
import { Spinner } from "@/components/ui/index.js";

interface Sesion { fecha: string; dia: string }

interface RegistroDetalle {
  nombre_completo: string;
  nombre_madre: string;
  fase: string;
  asistencia: string;
  ubicacion: string;
  nota: string;
}

function groupByMonth(items: Sesion[]) {
  const map = new Map<string, Sesion[]>();
  for (const item of items) {
    const parts = item.fecha.split("-");
    const key = `${parts[0]}-${parts[1]}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()].map(([key, sesiones]) => {
    const parts = key.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    return {
      key,
      label: d.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
      sesiones,
    };
  });
}

function fmtFechaCorta(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function fmtFechaLarga(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const BADGE: Record<string, string> = {
  "Sí":          "bg-emerald-100 text-emerald-700",
  "Justificado": "bg-amber-100 text-amber-700",
  "No":          "bg-slate-100 text-slate-500",
};

const LABEL: Record<string, string> = {
  "Sí":          "✅ Presente",
  "Justificado": "📋 Justificado",
  "No":          "❌ Ausente",
};

export default function Historial() {
  const [selected, setSelected]             = useState<Sesion | null>(null);
  const [confirmarEliminar, setConfirmar]   = useState(false);
  const [exportando, setExportando]         = useState(false);
  const [exportError, setExportError]       = useState("");

  const { data: fechas, isLoading: loadFechas } = useAsistenciaFechas();
  const filtros: Record<string, string> = selected ? { fecha: selected.fecha, dia: selected.dia } : {};
  const { data: rawRegistros, isLoading: loadDetalle } = useAsistencia(filtros);
  const eliminar = useEliminarDia();

  const registros = rawRegistros as RegistroDetalle[] | undefined;
  const grupos    = groupByMonth(fechas ?? []);
  const presentes = registros?.filter((r) => r.asistencia === "Sí").length ?? 0;
  const total     = registros?.length ?? 0;
  const tasa      = total > 0 ? Math.round((presentes / total) * 100) : 0;

  const handleEliminar = async () => {
    if (!selected) return;
    await eliminar.mutateAsync({ fecha: selected.fecha, dia: selected.dia });
    setSelected(null);
    setConfirmar(false);
  };

  const handleExportar = async () => {
    if (!selected) return;
    setExportando(true);
    setExportError("");
    try {
      const params = new URLSearchParams({ desde: selected.fecha, hasta: selected.fecha, dia: selected.dia });
      const blob = await api.download(`/api/exportar?${params}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asistencia-${selected.dia}-${selected.fecha}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setExportando(false);
    }
  };

  const handleSelect = (s: Sesion) => {
    setSelected(s);
    setConfirmar(false);
  };

  return (
    <div className="flex h-full">
      {/* ── Panel izquierdo ── */}
      <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Historial de sesiones</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {loadFechas ? "Cargando…" : `${fechas?.length ?? 0} sesiones guardadas`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadFechas ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : grupos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm">Sin sesiones registradas</p>
            </div>
          ) : (
            grupos.map(({ key, label, sesiones }) => (
              <div key={key}>
                <p className="px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-y border-slate-100 capitalize">
                  {label}
                </p>
                {sesiones.map((s) => {
                  const active = selected?.fecha === s.fecha && selected?.dia === s.dia;
                  return (
                    <button
                      key={`${s.fecha}-${s.dia}`}
                      onClick={() => handleSelect(s)}
                      className={[
                        "w-full text-left px-4 py-3 flex items-center justify-between gap-2 border-b border-slate-50 transition-all",
                        active
                          ? "bg-brand-50 border-l-2 border-l-brand-500 pl-[14px]"
                          : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div>
                        <p className={["text-sm font-medium", active ? "text-brand-700" : "text-slate-800"].join(" ")}>
                          {s.dia}
                        </p>
                        <p className="text-xs text-slate-400 capitalize mt-0.5">{fmtFechaCorta(s.fecha)}</p>
                      </div>
                      <svg
                        className={["h-4 w-4 shrink-0", active ? "text-brand-400" : "text-slate-300"].join(" ")}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <p className="text-6xl mb-4">📋</p>
            <p className="font-medium text-slate-500 text-lg">Selecciona una sesión</p>
            <p className="text-sm mt-1">Ver los registros de asistencia guardados</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 capitalize">
                    {selected.dia} — {fmtFechaLarga(selected.fecha)}
                  </h2>
                  {!loadDetalle && total > 0 && (
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-emerald-600 font-medium">{presentes} presentes</span>
                      <span className="text-sm text-slate-400">·</span>
                      <span className="text-sm text-slate-500">{total - presentes} ausentes</span>
                      <span className="text-sm text-slate-400">·</span>
                      <span className="text-sm text-slate-500">{total} total</span>
                    </div>
                  )}

                  {/* Barra de tasa */}
                  {!loadDetalle && total > 0 && (
                    <div className="flex items-center gap-3 mt-2.5">
                      <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${tasa}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-emerald-700">{tasa}%</span>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {/* Exportar */}
                  {total > 0 && !confirmarEliminar && (
                    <button
                      onClick={handleExportar}
                      disabled={exportando}
                      className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {exportando ? (
                        <span className="inline-block h-3 w-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : "↓"}
                      Excel
                    </button>
                  )}
                  {exportError && (
                    <span className="text-xs text-red-600">{exportError}</span>
                  )}

                  {/* Eliminar */}
                  {confirmarEliminar ? (
                    <>
                      <span className="text-sm text-red-600 font-medium">¿Eliminar esta sesión?</span>
                      <button
                        onClick={handleEliminar}
                        disabled={eliminar.isPending}
                        className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {eliminar.isPending ? "Eliminando…" : "Confirmar"}
                      </button>
                      <button
                        onClick={() => setConfirmar(false)}
                        className="px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmar(true)}
                      className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Eliminar sesión
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className="flex-1 overflow-auto p-6">
              {loadDetalle ? (
                <div className="flex justify-center py-20"><Spinner size="lg" /></div>
              ) : total === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="font-medium">Sin registros para esta sesión</p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bebé</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Madre</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Ubicación</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {registros!.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-slate-900">{r.nombre_completo}</p>
                            <p className="text-xs text-slate-400">{r.fase}</p>
                          </td>
                          <td className="px-4 py-2.5 hidden md:table-cell text-slate-600">
                            {r.nombre_madre}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={[
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              BADGE[r.asistencia] ?? BADGE["No"],
                            ].join(" ")}>
                              {LABEL[r.asistencia] ?? "❌ Ausente"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 hidden lg:table-cell text-slate-500 text-xs">
                            {r.ubicacion || "—"}
                          </td>
                          <td className="px-4 py-2.5 hidden xl:table-cell text-slate-500 text-xs">
                            {r.nota || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
