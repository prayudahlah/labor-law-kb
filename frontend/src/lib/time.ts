const startOfDay = (value: Date | number): number => {
  const d = typeof value === 'number' ? new Date(value) : value;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const FMT_TANGGAL = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const FMT_JAM = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });

/** "Baru saja" / "12 menit lalu" / "Kemarin" / "3 hari lalu" / "12 Sep 2025" */
export function formatRelative(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const menit = Math.floor(diff / 60_000);
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;

  const hariIni = startOfDay(now);
  const kemarin = hariIni - 86_400_000;
  const tsHari = startOfDay(timestamp);

  if (tsHari >= hariIni) return `${Math.max(1, Math.floor(diff / 3_600_000))} jam lalu`;
  if (tsHari >= kemarin) return 'Kemarin';

  const selisihHari = Math.round((hariIni - tsHari) / 86_400_000);
  if (selisihHari < 7) return `${selisihHari} hari lalu`;
  return FMT_TANGGAL.format(new Date(timestamp));
}

/** "14.35" */
export function formatJam(timestamp: number): string {
  return FMT_JAM.format(new Date(timestamp)).replace(':', '.');
}

export { startOfDay };
