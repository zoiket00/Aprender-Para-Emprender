import "dotenv/config";
import { supabase } from "./config/supabase.js";
import { createApp } from "./app.js";

const PORT = Number(process.env["PORT"] ?? 3000);
const app = createApp();

async function main() {
  const { count, error } = await supabase
    .from("participantes")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("❌  Supabase no responde:", error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀  API Aprender-Para-Emprender en http://localhost:${PORT}`);
    console.log(`✅  Supabase conectado — ${count} participantes en BD`);
    console.log(`🛡️  CORS permitido para: ${process.env["ALLOWED_ORIGIN"] ?? "localhost:5173"}\n`);
  });
}

main().catch((err: unknown) => {
  console.error("❌  Error fatal al arrancar:", err);
  process.exit(1);
});
