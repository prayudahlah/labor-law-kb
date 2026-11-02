import { buatSeed } from '../config/seedRecents';
import type { Recent } from '../types/chat';

/**
 * Penyimpanan recents.
 *
 * Sekarang: localStorage. Nanti kalau backend punya endpoint riwayat,
 * GANTI ISI FILE INI SAJA dengan implementasi fetch — komponen tidak
 * berubah karena semua method sudah berbentuk Promise.
 *
 *   async list()   { return (await fetch('/riwayat')).json() }
 *   async save(r)  { await fetch('/riwayat', { method: 'POST', body: JSON.stringify(r) }) }
 *   ...
 */

const KEY = 'lawkb.recents.v1';
const MAKS = 30;

function isRecent(value: unknown): value is Recent {
  const item = value as Recent | null;
  return (
    !!item &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.updatedAt === 'number' &&
    (item.mode === 'chat' || item.mode === 'dokumen') &&
    Array.isArray(item.messages)
  );
}

function simpan(list: Recent[]): void {
  const rapi = [...list]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAKS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rapi));
  } catch (err) {
    console.warn('[recents] gagal menulis ke localStorage.', err);
  }
}

function muat(): Recent[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter(isRecent).map(bersihkan);
        if (valid.length > 0) return valid;
      }
    }
  } catch (err) {
    console.warn('[recents] localStorage tidak terbaca, memakai data contoh.', err);
  }

  const seed = buatSeed();
  simpan(seed);
  return seed;
}

/** Buang disclaimer lama yang ikut tersimpan pada teks pesan (data contoh). */
function bersihkanTeks(teks: string): string {
  return teks.replace(/\s*Bukan nasihat hukum\.?/gi, '').trim();
}

function bersihkan(recents: Recent): Recent {
  return {
    ...recents,
    messages: recents.messages.map((message) => ({
      ...message,
      text: bersihkanTeks(message.text),
    })),
  };
}

export const recentsService = {
  async list(): Promise<Recent[]> {
    return muat();
  },

  async get(id: string): Promise<Recent | null> {
    return muat().find((item) => item.id === id) ?? null;
  },

  /** Timpa entri dengan id yang sama (atau tambahkan baru). */
  async save(recents: Recent): Promise<void> {
    const list = muat().filter((item) => item.id !== recents.id);
    list.push(recents);
    simpan(list);
  },

  async remove(id: string): Promise<void> {
    simpan(muat().filter((item) => item.id !== id));
  },
};
