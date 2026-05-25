import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useListaDia, useGuardarAsistencia } from "@/hooks/useAsistencia.js";
import { Button, Spinner, Select } from "@/components/ui/index.js";

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

const OPCIONES_ASISTENCIA = [
  { value: "Sí", label: "✅ Sí" },
  { value: "No", label: "❌ No" },
  { value: "Justificado", label: "📋 Justificado" },
];

const OPCIONES_UBICACION = [
  { value: "", label: "—" },
  { value: "Casa", label: "Casa" },
  { value: "Colegio", label: "Colegio" },
  { value: "Hospital", label: "Hospital" },
  { value: "Otro", label: "Otro" },
];

interface FilaAsistencia {
  NombreBebe: string;
  NombreMadre: string;
  Fase: string;
  Programa: string;
  Edad: string;
  Asistencia: string;
  Ubicacion: string;
  Reporte: string;
  Nota: string;
}

export default function Asistencia() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dia = params.get("dia") ?? "";
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0] ?? "");
  const [filas, setFilas] = useState<FilaAsistencia[]>([]);
  const [guardado, setGuardado] = useState(false);

  const { data: lista, isLoading } = useListaDia(dia || null);
  const guardar = useGuardarAsistencia();

  useEffect(() => {
    if (lista) {
      setFilas(lista.map((r) => ({
        ...r,
        Asistencia: "No",
        Ubicacion: "",
        Reporte: "No",
        Nota: "",
      })));
      setGuardado(false);
    }
  }, [lista]);

  const updateFila = (i: number, campo: keyof FilaAsistencia, valor: string) => {
    setFilas((prev) => prev.map((f, idx) => idx === i ? { ...f, [campo]: valor } : f));
  };

  const handleGuardar = async () => {
    await guardar.mutateAsync({
      fecha: fecha ?? "",
      dia,
      registros: filas.map((f) => ({
        NombreBebe: f.NombreBebe,
        NombreMadre: f.NombreMadre,
        Fase: f.Fase,
        ProgramaMadre: f.Programa,
        Edad: f.Edad,
        Asistencia: f.Asistencia,
        Ubicacion: f.Ubicacion,
        Reporte: f.Reporte,
        SituacionEspecifica: "",
        Nota: f.Nota,
        Extras: "",
        NoMatricula: "",
      })),
    });
    setGuardado(true);
  };

  const presentes = filas.filter((f) => f.Asistencia === "Sí").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/bienvenida")}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain mix-blend-multiply shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-slate-900">Asistencia — {dia}</h1>
                {filas.length > 0 && (
                  <span className="badge-azul">{presentes}/{filas.length} presentes</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Marca la asistencia de cada participante</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-blue-500"
            />
            {!DIAS.includes(dia) && (
              <Select
                options={DIAS.map((d) => ({ value: d, label: d }))}
                placeholder="Selecciona día"
                value={dia}
                onChange={(e) => navigate(`/asistencia?dia=${e.target.value}`)}
                className="w-36"
              />
            )}
            <Button
              onClick={handleGuardar}
              loading={guardar.isPending}
              disabled={filas.length === 0 || guardado}
            >
              {guardado ? "✅ Guardado" : "Guardar"}
            </Button>
          </div>
        </div>

        {guardar.isError && (
          <p className="mt-2 text-xs text-red-600">{guardar.error?.message}</p>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner size="lg" />
          </div>
        ) : !dia ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-medium">Selecciona un día para comenzar</p>
          </div>
        ) : filas.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">No hay participantes para el {dia}</p>
            <p className="text-sm mt-1">Agrega participantes desde la sección Participantes</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bebé</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Madre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Asistencia</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Ubicación</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filas.map((fila, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{fila.NombreBebe}</p>
                      <p className="text-xs text-slate-400">{fila.Fase}</p>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-slate-600">{fila.NombreMadre}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={fila.Asistencia}
                        onChange={(e) => updateFila(i, "Asistencia", e.target.value)}
                        className={[
                          "h-8 rounded-lg border px-2 text-xs font-medium cursor-pointer",
                          "focus:ring-2 focus:ring-blue-500 transition-colors",
                          fila.Asistencia === "Sí"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : fila.Asistencia === "Justificado"
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-slate-50 border-slate-200 text-slate-600",
                        ].join(" ")}
                      >
                        {OPCIONES_ASISTENCIA.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <select
                        value={fila.Ubicacion}
                        onChange={(e) => updateFila(i, "Ubicacion", e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 focus:ring-2 focus:ring-blue-500"
                      >
                        {OPCIONES_UBICACION.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 hidden xl:table-cell">
                      <input
                        type="text"
                        value={fila.Nota}
                        onChange={(e) => updateFila(i, "Nota", e.target.value)}
                        placeholder="Observación..."
                        className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs text-slate-600 focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
