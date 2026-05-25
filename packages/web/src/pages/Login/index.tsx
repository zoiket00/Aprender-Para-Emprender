import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.js";
import { Button } from "@/components/ui/index.js";
import { Input } from "@/components/ui/index.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signIn, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signIn(email, password);
      navigate("/bienvenida");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="Logo Aprender Para Emprender"
              className="h-24 w-24 object-contain mix-blend-multiply"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Aprender Para Emprender</h1>
          <p className="mt-1 text-sm text-slate-500">Colegio Cristiano · Control de Asistencia</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Acceso restringido — solo personal autorizado
        </p>
      </div>
    </div>
  );
}
