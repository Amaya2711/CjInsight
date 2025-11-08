// utils/supabase.ts
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// TU NUEVA URL y KEY (hardcodeadas para que no dependa del .env)
const SUPABASE_URL = "https://lgizmslffyaeeyogcdmm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnaXptc2xmZnlhZWV5b2djZG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjMyNjIsImV4cCI6MjA3NjYzOTI2Mn0.kUC9Vu1_Ox2jDKKE221wz2PcaM6BmIzV-KDAN6SYR2I";

const options =
  Platform.OS === "web"
    ? { auth: { persistSession: true, autoRefreshToken: true } }
    : { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);

export async function healthCheckSupabase() {
  const ref = SUPABASE_URL.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1];
  console.log("[HEALTH] URL:", SUPABASE_URL);
  console.log("[HEALTH] REF:", ref);
  const s = await supabase.from("sites_v1").select("id", { head: true, count: "exact" });
  const c = await supabase.from("cuadrillas").select("id", { head: true, count: "exact" });
  const t = await supabase.from("tickets_v1").select("id", { head: true, count: "exact" });
  const u = await supabase.from("usuario").select("id", { head: true, count: "exact" });
  console.log("[HEALTH] sites_v1:", s.count, s.error);
  console.log("[HEALTH] cuadrillas:", c.count, c.error);
  console.log("[HEALTH] tickets_v1:", t.count, t.error);
  console.log("[HEALTH] usuario:", u.count, u.error);
  if (ref !== "lgizmslffyaeeyogcdmm") {
    console.warn("[HEALTH] ADVERTENCIA: no estoy usando la nueva BD!");
  }
  
  const usuariosExample = await supabase.from("usuario").select("nombre_usuario, activo").limit(3);
  console.log("[HEALTH] Usuarios de ejemplo:", usuariosExample.data);
  
  return { sites: s, cuadrillas: c, tickets: t, usuario: u };
}