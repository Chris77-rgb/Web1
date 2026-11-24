"use client";
/** Browser-side JSON API client. Throws Error(message) with the server's error text. */
export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = (json as { details?: unknown }).details;
    let msg = (json as { error?: string }).error ?? `Error ${res.status}`;
    if (Array.isArray(details) && details.length && typeof details[0] === "object") msg += `: ${(details as { message: string }[]).map((d) => d.message).join(", ")}`;
    else if (Array.isArray(details) && details.length) msg += `: ${details.slice(0, 3).join("; ")}`;
    throw new HttpError(res.status, msg, details);
  }
  return json as T;
}

export async function upload(file: File, projectId?: string): Promise<{ url: string | null; key: string; assetId: string }> {
  const fd = new FormData();
  fd.append("file", file);
  if (projectId) fd.append("projectId", projectId);
  const res = await fetch("/api/v1/uploads", { method: "POST", body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, (json as { error?: string }).error ?? "Error al subir el archivo");
  return json as { url: string | null; key: string; assetId: string };
}
