import { useState, type FormEvent } from "react";
import {
  useParticipantes,
  useAsistenciaDias,
  useCrearParticipante,
  useEditarParticipante,
  useEliminarParticipante,
  type ParticipanteAPI,
} from "@/hooks/useParticipantes.js";
import { Button, Input, Modal, Spinner } from "@/components/ui/index.js";
import type { DIAS_VALIDOS } from "@ape/shared";

type Dia = (typeof DIAS_VALIDOS)[number];
const DIAS: Dia[] = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

interface FormData {
  nombre_completo: string;
  nombre_madre: string;
  fase: string;
  programa: string;
  edad: string;
  dias: Dia[];
}

const FORM_EMPTY: FormData = {
  nombre_completo: "", nombre_madre: "", fase: "", programa: "", edad: "", dias: [],
};

function buildPayload(form: FormData) {
  return {
    nombre_completo: form.nombre_completo,
    datos_extra: {
      nombre_madre: form.nombre_madre,
      fase:         form.fase,
      programa:     form.programa,
      edad:         form.edad,
    },
    dias: form.dias,
  };
}

export default function Participantes() {
  const { data: participantes, isLoading } = useParticipantes();
  const { data: diasMap } = useAsistenciaDias();
  const crear = useCrearParticipante();
  const editar = useEditarParticipante();
  const eliminar = useEliminarParticipante();

  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<"crear" | "editar" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(FORM_EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null);

  const filtrados = (participantes ?? []).filter((b) =>
    [b.nombre_completo, b.nombre_madre, b.fase].some((s) =>
      s.toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  const toggleDia = (dia: Dia) => {
    setForm((f) => ({
      ...f,
      dias: f.dias.includes(dia) ? f.dias.filter((d) => d !== dia) : [...f.dias, dia],
    }));
  };

  const abrirEditar = (b: ParticipanteAPI) => {
    setEditId(b.id);
    setForm({
      nombre_completo: b.nombre_completo,
      nombre_madre:    b.nombre_madre,
      fase:            b.fase,
      programa:        b.programa,
      edad:            b.edad,
      dias:            (diasMap?.[b.id] ?? []) as Dia[],
    });
    setModal("editar");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.dias.length === 0) return;
    const payload = buildPayload(form);
    if (modal === "crear") {
      await crear.mutateAsync(payload);
    } else if (modal === "editar" && editId) {
      await editar.mutateAsync({ id: editId, ...payload });
    }
    setModal(null);
    setForm(FORM_EMPTY);
    setEditId(null);
  };

  const handleEliminar = async () => {
    if (!confirmDelete) return;
    await eliminar.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  const mutacionError = crear.error?.message ?? editar.error?.message;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain mix-blend-multiply shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Participantes</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {participantes?.length ?? 0} registrados en el catálogo
            </p>
          </div>
        </div>
        <Button onClick={() => { setForm(FORM_EMPTY); setModal("crear"); }}>
          + Agregar participante
        </Button>
      </div>

      {/* Búsqueda */}
      <Input
        placeholder="Buscar por nombre, madre o institución..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Participante</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Madre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Días</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">
                    {busqueda ? "Sin resultados para esa búsqueda" : "No hay participantes registrados"}
                  </td>
                </tr>
              ) : filtrados.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{b.nombre_completo}</p>
                    <p className="text-xs text-slate-400">{b.fase} · {b.edad}m</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">{b.nombre_madre}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(diasMap?.[b.id] ?? []).map((d) => (
                        <span key={d} className="badge-azul">{d.slice(0, 3)}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => abrirEditar(b)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: b.id, nombre: b.nombre_completo })}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modal !== null}
        onClose={() => { setModal(null); setForm(FORM_EMPTY); }}
        title={modal === "crear" ? "Agregar participante" : "Editar participante"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              form="form-participante"
              type="submit"
              loading={crear.isPending || editar.isPending}
            >
              {modal === "crear" ? "Agregar" : "Guardar"}
            </Button>
          </>
        }
      >
        <form id="form-participante" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del participante"
            value={form.nombre_completo}
            onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))}
            required
          />
          <Input
            label="Nombre de la madre"
            value={form.nombre_madre}
            onChange={(e) => setForm((f) => ({ ...f, nombre_madre: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fase / Institución"
              value={form.fase}
              onChange={(e) => setForm((f) => ({ ...f, fase: e.target.value }))}
            />
            <Input
              label="Edad (meses)"
              value={form.edad}
              onChange={(e) => setForm((f) => ({ ...f, edad: e.target.value }))}
              type="number"
              min="0"
              max="36"
            />
          </div>
          <Input
            label="Programa"
            value={form.programa}
            onChange={(e) => setForm((f) => ({ ...f, programa: e.target.value }))}
          />

          {/* Días */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Días de asistencia
              {form.dias.length === 0 && <span className="text-red-500 ml-1">*</span>}
            </p>
            <div className="flex gap-2 flex-wrap">
              {DIAS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDia(d)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    form.dias.includes(d)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-300",
                  ].join(" ")}
                >
                  {d}
                </button>
              ))}
            </div>
            {form.dias.length === 0 && (
              <p className="text-xs text-red-500 mt-1.5">Selecciona al menos un día</p>
            )}
          </div>

          {mutacionError && (
            <p className="text-xs text-red-600">{mutacionError}</p>
          )}
        </form>
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar participante"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="danger" loading={eliminar.isPending} onClick={handleEliminar}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          ¿Estás segura de que quieres eliminar a{" "}
          <span className="font-semibold text-slate-900">{confirmDelete?.nombre}</span>?
          Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
