/**
 * SATU-SATUNYA tempat definisi warna aplikasi.
 *
 * Aturan main:
 * - Ubah warna -> cukup edit objek `palette` di bawah. Tidak perlu menyentuh
 *   komponen mana pun.
 * - `applyTheme()` menyalin seluruh palet ke CSS variable (`--c-*`) di
 *   `:root`, lalu utility Tailwind (lihat src/styles/global.css) membacanya.
 * - Mode gelap nanti: tambahkan objek `dark` dengan kunci yang sama, lalu
 *   `applyTheme(dark)`. Komponen tidak berubah sama sekali.
 *
 * Palet saat ini: "Navy & Gold" — formal, klasik, untuk expert system hukum.
 */

export const palette = {
  // --- Warna utama ---
  navy: '#14304F', // aksi utama: tombol, bubble assistant, chip aktif
  navyHover: '#0E2439',
  navyLight: '#3C6E9F', // gradien blob & aksen lembut
  navySoft: '#E6ECF3', // latar hover / chip sekunder

  gold: '#C08A2E', // aksen dekoratif (garis, ikon, blob)
  goldSoft: '#F5EBD8', // latar aksen lembut
  goldText: '#8F6419', // versi teks — kontras AA di atas putih

  // --- Permukaan ---
  bg: '#FAF9F6', // latar utama aplikasi (putih hangat)
  surface: '#FFFFFF', // kartu, composer, bubble
  surfaceMuted: '#F3F1EB', // sidebar
  border: '#E7E3DA',
  borderStrong: '#D6D1C5',

  // --- Teks ---
  text: '#1F2429',
  textMuted: '#6E675C',
  textInverse: '#FFFFFF',

  // --- Status ---
  success: '#2F7A4F', // dot backend sehat
  danger: '#B3372E', // dot backend mati / error
  dangerSoft: '#FBECEA', // latar kartu galat
} as const;

export type Palette = typeof palette;

/** camelCase -> kebab-case: navyHover -> navy-hover */
const toKebab = (key: string): string => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Salin palet ke CSS variable di :root. Dipanggil sekali saat aplikasi mulai. */
export function applyTheme(p: Palette = palette): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(p)) {
    root.style.setProperty(`--c-${toKebab(key)}`, value);
  }
}
