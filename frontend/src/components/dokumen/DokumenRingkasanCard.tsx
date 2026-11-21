import { useState } from 'react';

import { namaBerkas } from '../../lib/dokumen';
import { cx } from '../../lib/cx';
import CardShell from '../cards/CardShell';
import { IconCopy, IconDoc, IconDownload } from '../common/icons';

type Props = {
  teks: string;
  judul: string;
  onUbah: (teks: string) => void;
  onSimpan: () => void;
  /** Ringkasan di layar sama dengan yang tersimpan. */
  tersimpan?: boolean;
  onTutup: () => void;
};

/** Ringkasan pasal bertanda — bisa diketik untuk menambah catatan. */
export default function DokumenRingkasanCard({
  teks,
  judul,
  onUbah,
  onSimpan,
  tersimpan,
  onTutup,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'tersalin' | 'gagal'>('idle');

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(teks);
      setStatus('tersalin');
    } catch {
      setStatus('gagal');
    }
    window.setTimeout(() => setStatus('idle'), 2000);
  };

  const unduh = () => {
    const blob = new Blob([teks], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement('a');
    tautan.href = url;
    tautan.download = namaBerkas(`ringkasan ${judul}`);
    document.body.appendChild(tautan);
    tautan.click();
    tautan.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <CardShell
      title={`Ringkasan · ${judul}`}
      icon={<IconDoc className="h-3.5 w-3.5" />}
      className="flex min-h-0 flex-1 flex-col"
      bodyClassName="flex min-h-0 flex-1 flex-col"
      headerRight={
        <>
          <button
            type="button"
            onClick={onSimpan}
            className={cx(
              'rounded-lg border px-2 py-0.5 text-[10.5px] transition',
              tersimpan
                ? 'border-line bg-surface font-medium text-ink-muted hover:border-line-strong hover:text-ink'
                : 'border-navy bg-navy font-semibold text-ink-inverse hover:bg-navy-hover',
            )}
          >
            Simpan
          </button>
          <button
            type="button"
            onClick={salin}
            className="flex items-center gap-1 rounded-lg border border-line-strong bg-surface px-2 py-0.5 text-[10.5px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
          >
            <IconCopy className="h-3 w-3" />
            {status === 'tersalin' ? 'Tersalin' : status === 'gagal' ? 'Gagal' : 'Salin'}
          </button>
          <button
            type="button"
            onClick={unduh}
            className="flex items-center gap-1 rounded-lg border border-line-strong bg-surface px-2 py-0.5 text-[10.5px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
          >
            <IconDownload className="h-3 w-3" />
            Unduh .md
          </button>
        </>
      }
    >
      <p className="shrink-0 text-[11px] leading-5 text-ink-muted">
        Semua pasal bertanda, dikelompokkan per topik. Kamu bisa menambah catatan sendiri di
        kotak ini.
      </p>

      <textarea
        value={teks}
        onChange={(event) => onUbah(event.target.value)}
        spellCheck={false}
        className="mt-2 min-h-0 flex-1 resize-none rounded-lg border border-line bg-surface-muted p-2.5 font-mono text-[11px] leading-[18px] text-ink outline-none"
      />

      <div className="mt-2 flex shrink-0 items-center justify-end">
        <button
          type="button"
          onClick={onTutup}
          className="rounded-lg border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-muted transition hover:border-navy-soft hover:text-ink"
        >
          ← Kembali
        </button>
      </div>
    </CardShell>
  );
}
