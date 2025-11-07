export function formatSupabaseError(err: any) {
  const e = err?.error ?? err;
  return {
    message: e?.message ?? String(e),
    details: e?.details ?? e?.hint ?? null,
    hint: e?.hint ?? null,
    code: e?.code ?? null,
    status: e?.status ?? null,
    name: e?.name ?? null,
    stack: e?.stack ?? null,
  };
}

export function errorToString(err: any) {
  const f = formatSupabaseError(err);
  return [
    f.message,
    f.details ? `\nDetails: ${f.details}` : "",
    f.hint ? `\nHint: ${f.hint}` : "",
    f.code || f.status ? `\nCode/Status: ${f.code ?? ""}/${f.status ?? ""}` : "",
  ].join("");
}
