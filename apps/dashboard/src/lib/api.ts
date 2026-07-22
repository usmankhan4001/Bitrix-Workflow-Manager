// Wraps fetch with the API base URL and the shared secret, when configured.
// Mirrors apps/api/src/common/api-key.guard.ts — permissive when VITE_API_KEY
// is unset, so local dev keeps working without any extra setup.

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

function withKey(path: string): string {
  if (!API_KEY) return `${API_BASE}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${API_BASE}${path}${sep}api_key=${encodeURIComponent(API_KEY)}`;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(withKey(path), init);
}
