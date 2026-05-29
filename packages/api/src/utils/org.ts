import { supabase } from "../config/supabase.js";
import { TtlCache } from "./cache.js";

interface OrgMember {
  orgId: string;
  rol: string;
}

// userId → { orgId, rol } — 10 min TTL (membresía no cambia con frecuencia)
const orgCache = new TtlCache<string, OrgMember>(10 * 60_000);

export async function getOrgMember(userId: string): Promise<OrgMember | null> {
  const cached = orgCache.get(userId);
  if (cached) return cached;

  const { data } = await supabase
    .from("miembros_org")
    .select("org_id, rol")
    .eq("usuario_id", userId)
    .single();

  if (!data?.org_id) return null;

  const member: OrgMember = { orgId: data.org_id, rol: data.rol ?? "miembro" };
  orgCache.set(userId, member);
  return member;
}

export async function getOrgId(userId: string): Promise<string | null> {
  return (await getOrgMember(userId))?.orgId ?? null;
}

export function clearOrgCache(userId: string): void {
  orgCache.del(userId);
}
