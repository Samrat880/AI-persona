/**
 * Backend API base URL.
 * - Local dev: http://localhost:3000
 * - Vercel (same origin): leave VITE_BACKEND_URL empty
 */
export function getBackendUrl(): string {
  const raw = import.meta.env.VITE_BACKEND_URL as string | undefined;
  return raw?.replace(/\/$/, "") ?? "";
}

/** Build a full API path, e.g. apiUrl("/token") => "/api/token" or "http://localhost:3000/api/token" */
export function apiUrl(path: string): string {
  const base = getBackendUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}/api${normalizedPath}`;
  return url;
}
