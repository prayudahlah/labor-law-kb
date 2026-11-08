import type { RecentsFilter } from '../types/app';
import type { Recent } from '../types/chat';
import { startOfDay } from './time';

export type RecentsGroup = { label: string; items: Recent[] };

const LABEL_GRUP = ['Hari ini', 'Kemarin', '7 hari lalu', 'Lebih lama'] as const;

/**
 * Saring + urutkan: mode (filter) dan judul (query) dipakai bersamaan (AND),
 * lalu terbaru dulu.
 */
export function applyFilter(
  items: Recent[],
  filter: RecentsFilter,
  query: string,
): Recent[] {
  const q = query.trim().toLowerCase();
  return items
    .filter((item) => filter === 'semua' || item.mode === filter)
    .filter((item) => q === '' || item.title.toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Kelompokkan per rentang hari. Grup kosong tidak dirender. */
export function groupByHari(items: Recent[], now: number = Date.now()): RecentsGroup[] {
  const hariIni = startOfDay(now);
  const kemarin = hariIni - 86_400_000;
  const tujuhHari = hariIni - 7 * 86_400_000;

  const bucket: Record<string, Recent[]> = {
    'Hari ini': [],
    'Kemarin': [],
    '7 hari lalu': [],
    'Lebih lama': [],
  };

  for (const item of items) {
    const ts = startOfDay(item.updatedAt);
    if (ts >= hariIni) bucket['Hari ini'].push(item);
    else if (ts >= kemarin) bucket['Kemarin'].push(item);
    else if (ts >= tujuhHari) bucket['7 hari lalu'].push(item);
    else bucket['Lebih lama'].push(item);
  }

  return LABEL_GRUP.filter((label) => bucket[label].length > 0).map((label) => ({
    label,
    items: bucket[label].sort((a, b) => b.updatedAt - a.updatedAt),
  }));
}
