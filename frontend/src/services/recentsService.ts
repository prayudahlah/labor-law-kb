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
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch (err) {
    console.warn('[recents] localStorage tidak terbaca, memakai data contoh.', err);
    return buatSeed();
  }

  // Key belum ada = pengguna baru: isi dengan contoh.
  // Key ada tetapi isinya [] = riwayat memang sengaja dikosongkan.
  if (raw === null) {
    const seed = buatSeed();
    simpan(seed);
    return seed;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const sah = parsed.filter(isRecent);
      const valid = sah.map(bersihkan).map(modeSebenarnya);
      // Migrasi mode lama hanya perlu ditulis sekali.
      if (valid.some((item, index) => item.mode !== sah[index].mode)) {
        simpan(valid);
      }
      return valid;
    }
  } catch (err) {
    console.warn('[recents] localStorage tidak terbaca, memakai data contoh.', err);
  }

  const seed = buatSeed();
  simpan(seed);
  return seed;
}

/**
 * Entri lama bisa bertanda `dokumen` padahal isinya percakapan chat (tanpa
 * draf, ringkasan, atau pilihan dokumen). Mode itu membuat pesannya tidak
 * pernah dirender, jadi entri seperti itu dianggap chat.
 */
function modeSebenarnya(recents: Recent): Recent {
  if (recents.mode !== 'dokumen') return recents;
  const adaDraf = recents.messages.some((message) => message.draf);
  const adaDokumen = Boolean(recents.dokumenId) || Boolean(recents.ringkasan);
  return adaDraf || adaDokumen ? recents : { ...recents, mode: 'chat' };
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

  async clear(): Promise<void> {
    simpan([]);
  },
};
