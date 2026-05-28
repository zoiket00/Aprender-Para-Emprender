import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.js";

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"] as const;
const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

const DIA_CONFIG = {
  Lunes:     { color: "bg-violet-50 border-violet-200 hover:bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  Martes:    { color: "bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-700",      dot: "bg-brand-500" },
  Miercoles: { color: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  Jueves:    { color: "bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-800",     dot: "bg-amber-500" },
  Viernes:   { color: "bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-800",         dot: "bg-rose-500" },
} as const;

export default function Bienvenida() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const ahora   = new Date();
  const hora    = ahora.getHours();
  const diaHoy  = DIAS_SEMANA[ahora.getDay()] ?? "";
  const saludo  = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";

  const nombre = user?.email?.split("@")[0] ?? "profesora";

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-in">
      {/* Logo + Saludo */}
      <div className="flex items-center gap-5 mb-8">
        <img
          src="/logo.png"
          alt="Logo Aprender Para Emprender"
          className="h-16 w-16 object-contain mix-blend-multiply shrink-0"
        />
        <div>
          <p className="text-sm text-slate-500 mb-0.5">{saludo} 👋</p>
          <h1 className="text-2xl font-bold text-slate-900 capitalize">{nombre}</h1>
          <p className="mt-0.5 text-slate-500 text-sm">¿Qué día vas a registrar hoy?</p>
        </div>
      </div>

      {/* Selector de días */}
      <div className="grid grid-cols-1 gap-3">
        {DIAS.map((dia) => {
          const cfg   = DIA_CONFIG[dia];
          const esHoy = dia === diaHoy;
          return (
            <button
              key={dia}
              onClick={() => navigate(`/asistencia?dia=${dia}`)}
              className={[
                "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150",
                "text-left cursor-pointer group",
                cfg.color,
                esHoy ? "ring-2 ring-offset-1 ring-current/20" : "",
              ].join(" ")}
            >
              <div className={["h-3 w-3 rounded-full shrink-0", cfg.dot].join(" ")} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base">{dia}</p>
                  {esHoy && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-current/10 opacity-80">
                      Hoy
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-70 mt-0.5">
                  {esHoy ? "Registrar asistencia de hoy" : "Registrar asistencia del día"}
                </p>
              </div>
              <svg
                className="h-5 w-5 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Accesos rápidos */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="card p-4 text-left hover:border-brand-200 hover:shadow-md transition-all group"
        >
          <p className="text-2xl mb-2">📊</p>
          <p className="font-medium text-slate-800 text-sm">Dashboard</p>
          <p className="text-xs text-slate-500">Ver estadísticas</p>
        </button>
        <button
          onClick={() => navigate("/participantes")}
          className="card p-4 text-left hover:border-brand-200 hover:shadow-md transition-all group"
        >
          <p className="text-2xl mb-2">👶</p>
          <p className="font-medium text-slate-800 text-sm">Participantes</p>
          <p className="text-xs text-slate-500">Gestionar catálogo</p>
        </button>
        <button
          onClick={() => navigate("/historial")}
          className="card p-4 text-left hover:border-brand-200 hover:shadow-md transition-all group"
        >
          <p className="text-2xl mb-2">🕐</p>
          <p className="font-medium text-slate-800 text-sm">Historial</p>
          <p className="text-xs text-slate-500">Sesiones pasadas</p>
        </button>
      </div>
    </div>
  );
}
