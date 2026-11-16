import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ButirKetentuan } from '../types/api';

const KEY = 'lawkb.checklist.session.v1';
/** Kunci lama (centang per jenis dokumen) — hanya untuk migrasi entri lama. */
const KEY_LAMA = 'lawkb.checklist.v1';

/** Kunci stabil per butir: satu pasal bisa punya beberapa norma. */
export function kunciButir(item: ButirKetentuan): string {
  return `${item.norma}|${item.pasal}`;
}

type Peta = Record<string, string[]>;

function bacaPeta(): Peta {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const hasil: Peta = {};
    for (const [kunci, nilai] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(nilai)) {
        hasil[kunci] = nilai.filter((item): item is string => typeof item === 'string');
      }
    }
    return hasil;
  } catch (err) {
    console.warn('[checklist] gagal membaca sessionStorage.', err);
    return {};
  }
}

function tulisPeta(peta: Peta): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(peta));
  } catch (err) {
    console.warn('[checklist] gagal menulis sessionStorage.', err);
  }
}

/**
 * Centang versi lama (per jenis dokumen). Dipakai sekali saat membuka entri
 * riwayat yang dibuat sebelum centang disimpan di dalam entri.
 */
export function bacaChecklistLama(dokumenId: string): string[] {
  try {
    const raw = window.localStorage.getItem(KEY_LAMA);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    const nilai = (parsed as Record<string, unknown>)[dokumenId];
    return Array.isArray(nilai)
      ? nilai.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

/**
 * Centang "sudah dimasukkan ke dokumen" untuk satu sesi kerja.
 *
 * Disimpan di `sessionStorage` per `sesi`, sehingga:
 * - New Chat mulai dari kosong (sesi baru),
 * - reload halaman tidak menghapus pekerjaan yang belum disimpan,
 * - membuka entri riwayat memulihkan centang lewat `awal`.
 */
export function useChecklist(sesi: string | null, awal?: readonly string[] | null) {
  /** JSON dipakai agar kunci butir (yang mengandung `|`) tidak rusak. */
  const awalKey = useMemo(() => JSON.stringify(awal ?? []), [awal]);
  const [ditandai, setDitandai] = useState<Set<string>>(() => new Set(awal ?? []));

  useEffect(() => {
    if (!sesi) {
      setDitandai(new Set());
      return;
    }
    const tersimpan = bacaPeta()[sesi];
    if (tersimpan) {
      setDitandai(new Set(tersimpan));
      return;
    }
    const awalSesi = JSON.parse(awalKey) as string[];
    setDitandai(new Set(awalSesi));
    if (awalSesi.length > 0) {
      const peta = bacaPeta();
      peta[sesi] = awalSesi;
      tulisPeta(peta);
    }
  }, [sesi, awalKey]);

  const simpan = useCallback(
    (baru: Set<string>) => {
      if (!sesi) return;
      const peta = bacaPeta();
      if (baru.size === 0) {
        delete peta[sesi];
      } else {
        peta[sesi] = [...baru];
      }
      tulisPeta(peta);
    },
    [sesi],
  );

  const toggle = useCallback(
    (kunci: string) => {
      if (!sesi) return;
      setDitandai((lama) => {
        const baru = new Set(lama);
        if (baru.has(kunci)) {
          baru.delete(kunci);
        } else {
          baru.add(kunci);
        }
        simpan(baru);
        return baru;
      });
    },
    [sesi, simpan],
  );

  const hapusSemua = useCallback(() => {
    if (!sesi) return;
    simpan(new Set());
    setDitandai(new Set());
  }, [sesi, simpan]);

  return { ditandai, toggle, hapusSemua };
}

export type ChecklistApi = ReturnType<typeof useChecklist>;
