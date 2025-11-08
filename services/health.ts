import { validateSupabaseConnection } from "@/utils/validateSupabaseConnection";

export async function probeSchema() {
  return await validateSupabaseConnection();
}
