import { useState } from "react";
import { useAsistencia } from "@/hooks/useAsistencia.js";
import { Button, Spinner } from "@/components/ui/index.js";

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

function hoy() {
  return new Date().toISOString().split("T")[0] ?? "";
}

function primerDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function Dashboard() {
  const [desde, setDesde] = useState(primerDiaMes());
  const [hasta, setHasta] = useState(hoy());
  const [diaFiltro, setDiaFiltro] = useState("");
  const [aplicado, setAplicado] = useState(false);

  const filtros = aplicado ? { desde, hasta, ...(diaFiltro ? { dia: diaFiltro } : {}) } : {};
  const { data: registros, isLoading } = useAsistencia(filtros);

  const handleAplicar = () => setAplicado(true);

  const handleExportar = () => {
    const params = new URLSearchParams({ desde, hasta, ...(diaFiltro ? { dia: diaFiltro } : {}) });
    window.open(`/api/exportar?${params}`, "_blank");
  };

  // Stats calculadas del lado cliente
  const total = registros?.length ?? 0;
  const presentes = registros?.filter((r) => r.asistencia === "Sí").length ?? 0;
  const tasa = total > 0 ? Math.round((presentes / total) * 100) : 0;
  const justificados = registros?.filter((r) => r.asistencia === "Justificado").length ?? 0;

  const porDia: Record<string, { total: number; presentes: number }> = {};
  registros?.forEach((r) => {
    if (!porDia[r.dia]) porDia[r.dia] = { total: 0, presentes: 0 };
    porDia[r.dia]!.total++;
    if (r.asistencia === "Sí") porDia[r.dia]!.presentes++;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain mix-blend-multiply shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Estadísticas de asistencia</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => { setDesde(e.target.value); setAplicado(false); }}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => { setHasta(e.target.value); setAplicado(false); }}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">Día</label>
          <select
            value={diaFiltro}
            onChange={(e) => { setDiaFiltro(e.target.value); setAplicado(false); }}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Todos</option>
            {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <Button onClick={handleAplicar}>Buscar</Button>
        {aplicado && total > 0 && (
          <Button variant="secondary" onClick={handleExportar}>
            ↓ Exportar Excel
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !aplicado ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">Selecciona un rango y haz clic en Buscar</p>
        </div>
      ) : total === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">Sin registros para este período</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <p className="text-xs font-medium text-slate-500">Total registros</p>
              <p className="text-3xl font-bold text-slate-900">{total}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium text-slate-500">Presentes</p>
              <p className="text-3xl font-bold text-emerald-600">{presentes}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium text-slate-500">Tasa asistencia</p>
              <p className="text-3xl font-bold text-brand-500">{tasa}%</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium text-slate-500">Justificados</p>
              <p className="text-3xl font-bold text-amber-600">{justificados}</p>
            </div>
          </div>

          {/* Por día */}
          {Object.keys(porDia).length > 1 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Asistencia por día</h3>
              <div className="space-y-3">
                {DIAS.filter((d) => porDia[d]).map((d) => {
                  const s = porDia[d]!;
                  const pct = Math.round((s.presentes / s.total) * 100);
                  return (
                    <div key={d} className="flex items-center gap-3">
                      <span className="w-20 text-sm text-slate-600 shrink-0">{d}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-16 text-right shrink-0">
                        {s.presentes}/{s.total} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
