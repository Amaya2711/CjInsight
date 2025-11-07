import { errorToString, formatSupabaseError } from "./formatSupabaseError";

type SupaResp<T> = { data: T | null; error: any; status?: number; count?: number | null };

export async function supaRun<T>(
  promise: Promise<SupaResp<T>>,
  ctx: string
): Promise<T> {
  const { data, error, status, count } = await promise;
  if (error) {
    const f = formatSupabaseError({ ...error, status });
    console.error(`[SUPA ERROR] ${ctx}`, f);
    throw new Error(`[SUPA] ${ctx} :: ${errorToString({ ...error, status })}`);
  }
  if (Array.isArray(data)) {
    console.log(`[SUPA OK] ${ctx} -> rows: ${data.length}${count !== undefined ? ` (total: ${count})` : ""}`);
  } else {
    console.log(`[SUPA OK] ${ctx}${count !== undefined ? ` (count: ${count})` : ""}`);
  }
  return (data as T) ?? (null as any);
}
