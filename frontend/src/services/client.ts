/** Pengambil JSON ke backend. Dipanggil service (chatService, dll). */

/**
 * Kosong = pakai proxy dev Vite (lihat vite.config.ts). Isi lewat .env bila
 * frontend di-host terpisah dari backend.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'Backend tidak terjangkau. Jalankan: docker compose up --build',
    );
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    throw new ApiError(response.status, `Permintaan ditolak (HTTP ${response.status})`, detail);
  }

  return data as T;
}

export async function getJSON<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`);
  } catch {
    throw new ApiError(0, 'Backend tidak terjangkau.');
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, `HTTP ${response.status}`);
  return data as T;
}
