import { IconSearch } from '../common/icons';

type Props = { value: string; onChange: (next: string) => void };

/** Pencarian riwayat — menyaring judul secara langsung saat mengetik. */
export default function SearchBox({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2 transition focus-within:border-navy-light">
      <IconSearch className="h-4 w-4 shrink-0 text-ink-muted" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Cari riwayat…"
        aria-label="Cari riwayat"
        className="w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {value !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Hapus pencarian"
          className="shrink-0 rounded px-1 text-[13px] leading-none text-ink-muted transition hover:text-ink"
        >
          ✕
        </button>
      )}
    </label>
  );
}
