import { kunciButir } from '../hooks/useChecklist';
import type { ButirKetentuan } from '../types/api';
import { labelManusia } from './text';

/**
 * Ringkasan markdown dari pasal yang sudah ditandai.
 *
 * Memuat SEMUA pasal bertanda (bukan hanya hasil filter topik), dikelompokkan
 * per topik, dengan tautan sumber bila ada.
 *
 * `denganInfo` menambahkan baris "Jenis dokumen" dan "Ditandai" — dipakai saat
 * header dokumen (yang sudah menampilkan info itu) sedang disembunyikan.
 */
export function susunRingkasan(
  judul: string,
  namaDokumen: string,
  butir: ButirKetentuan[],
  ditandai: Set<string>,
  denganInfo = true,
): string {
  const terpilih = butir.filter((item) => ditandai.has(kunciButir(item)));

  const baris: string[] = denganInfo
    ? [
        `# ${judul}`,
        '',
        `Jenis dokumen: ${namaDokumen}`,
        `Ditandai: ${terpilih.length} dari ${butir.length} pasal`,
        '',
      ]
    : [];

  const perTopik = new Map<string, ButirKetentuan[]>();
  for (const item of terpilih) {
    const daftar = perTopik.get(item.topik) ?? [];
    daftar.push(item);
    perTopik.set(item.topik, daftar);
  }

  for (const [topik, daftar] of [...perTopik.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    baris.push(`## ${topik} (${daftar.length})`);
    for (const item of daftar) {
      const tautan = item.tautan ? ` — [${item.tautan}]` : '';
      baris.push(`- ${item.pasal} — ${labelManusia(item.jenis)}${tautan}`);
    }
    baris.push('');
  }

  return baris.join('\n').trim();
}
