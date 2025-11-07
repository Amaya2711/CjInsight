import { supabase } from "./supabase";

export function isValidImageUri(uri: string | null | undefined): boolean {
  if (!uri || typeof uri !== "string") return false;
  const trimmed = uri.trim();
  if (trimmed.length === 0) return false;
  return true;
}

export function getSupabaseStorageUrl(bucket: string, path: string): string | null {
  if (!path || !path.trim()) return null;
  
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data?.publicUrl || data.publicUrl.trim() === "") return null;
    return data.publicUrl;
  } catch (error) {
    console.error("[ImageUtils] Error getting storage URL:", error);
    return null;
  }
}

export function safeImageUri(uri: string | null | undefined): string | null {
  return isValidImageUri(uri) ? (uri as string) : null;
}
