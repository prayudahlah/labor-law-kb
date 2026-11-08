import { useEffect, useState } from 'react';

import { getJSON } from '../services/client';
import type { HealthStatus } from '../types/app';

/**
 * Poll `GET /health` tiap beberapa detik untuk mengisi dot status backend.
 * - 'pending' hanya berlaku sebelum cek pertama selesai
 * - 'ok'  backend menjawab { "status": "ok" }
 * - 'error' backend mati / tidak terjangkau / respons aneh
 */
export function useHealth(intervalMs = 12_000): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>('pending');

  useEffect(() => {
    let hidup = true;

    const cek = async () => {
      try {
        const res = await getJSON<{ status: string }>('/health');
        if (hidup) setStatus(res.status === 'ok' ? 'ok' : 'error');
      } catch {
        if (hidup) setStatus('error');
      }
    };

    void cek();
    const id = window.setInterval(() => void cek(), intervalMs);

    return () => {
      hidup = false;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return status;
}
