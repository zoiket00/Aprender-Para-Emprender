import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "./store/auth.js";
import { AppShell } from "./components/layout/AppShell.js";
import { Spinner } from "./components/ui/index.js";

const Login         = lazy(() => import("./pages/Login/index.js"));
const Bienvenida    = lazy(() => import("./pages/Bienvenida/index.js"));
const Asistencia    = lazy(() => import("./pages/Asistencia/index.js"));
const Dashboard     = lazy(() => import("./pages/Dashboard/index.js"));
const Participantes = lazy(() => import("./pages/Participantes/index.js"));
const Historial     = lazy(() => import("./pages/Historial/index.js"));

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function ProtectedRoute() {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize().catch(() => {});
  }, [initialize]);

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/bienvenida" replace />} />
            <Route path="/bienvenida"    element={<Bienvenida />} />
            <Route path="/asistencia"    element={<Asistencia />} />
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/participantes" element={<Participantes />} />
            <Route path="/historial"     element={<Historial />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/bienvenida" replace />} />
      </Routes>
    </Suspense>
  );
}
