import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/auth.js";
import { AppShell } from "./components/layout/AppShell.js";
import { Spinner } from "./components/ui/index.js";

const Login         = lazy(() => import("./pages/Login/index.js"));
const Bienvenida    = lazy(() => import("./pages/Bienvenida/index.js"));
const Asistencia    = lazy(() => import("./pages/Asistencia/index.js"));
const Dashboard     = lazy(() => import("./pages/Dashboard/index.js"));
const Participantes = lazy(() => import("./pages/Participantes/index.js"));

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (initialized && !user) {
      navigate("/login", { state: { from: location }, replace: true });
    }
  }, [initialized, user, navigate, location]);

  if (!initialized) return <Loader />;
  if (!user) return null;
  return <>{children}</>;
}

export default function App() {
  const { initialize, initialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) return <Loader />;

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route index element={<Navigate to="/bienvenida" replace />} />
                  <Route path="bienvenida"    element={<Bienvenida />} />
                  <Route path="asistencia"    element={<Asistencia />} />
                  <Route path="dashboard"     element={<Dashboard />} />
                  <Route path="participantes" element={<Participantes />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/bienvenida" replace />} />
      </Routes>
    </Suspense>
  );
}
