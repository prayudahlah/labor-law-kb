import { useState } from 'react';

import { namaBerkas } from '../../lib/dokumen';
import type { DokumenResponse } from '../../types/api';
import CardShell from '../cards/CardShell';
import { IconCopy, IconDoc } from '../common/icons';

type Props = {
  draf: DokumenResponse;
  namaPerusahaan?: string;
};

/** Ringkasan draf + tombol salin/unduh; pratinjau dibuka sesuai permintaan. */
export default function DokumenDrafCard({ draf, namaPerusahaan }: Props) {
  const [status, setStatus] = useState<'idle' | 'tersalin' | 'gagal'>('idle');
  const [buka, setBuka] = useState(false);
  const jumlahKlausul = draf.wajib.length + draf.opsional.length;

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(draf.template);
      setStatus('tersalin');
    } catch {
      setStatus('gagal');
    }
    window.setTimeout(() => setStatus('idle'), 2000);
  };

  const unduh = () => {
    const blob = new Blob([draf.template], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tautan = document.createElement('a');
    tautan.href = url;
    tautan.download = namaBerkas(draf.judul, namaPerusahaan);
    document.body.appendChild(tautan);
    tautan.click();
    tautan.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <CardShell
      title={`Draf · ${draf.judul}`}
      icon={<IconDoc className="h-3.5 w-3.5" />}
      className="shrink-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-ink-muted">
          {jumlahKlausul} klausul · {draf.pasal.length} pasal
          {draf.catatan ? ` · ${draf.catatan}` : ''}
        </p>
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="text-[11.5px] font-medium text-navy hover:underline"
        >
          Lihat pratinjau
        </button>
      </div>

      {buka && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${draf.judul}`}
          onClick={() => setBuka(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface-muted px-4 py-2.5">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                Pratinjau · {draf.judul}
              </h3>
              <button
                type="button"
                onClick={() => setBuka(false)}
                className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-muted hover:border-navy-soft hover:text-ink"
              >
                Tutup
              </button>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[11.5px] leading-5 whitespace-pre-wrap text-ink">
              {draf.template}
            </pre>
            <div className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-2.5">
              <button
                type="button"
                onClick={salin}
                className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-[12px] font-medium text-ink-inverse transition hover:bg-navy-hover"
              >
                <IconCopy className="h-3.5 w-3.5" />
                {status === 'tersalin' ? 'Tersalin' : status === 'gagal' ? 'Gagal menyalin' : 'Salin'}
              </button>
              <button
                type="button"
                onClick={unduh}
                className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
              >
                Unduh .md
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={salin}
          className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-[12px] font-medium text-ink-inverse transition hover:bg-navy-hover"
        >
          <IconCopy className="h-3.5 w-3.5" />
          {status === 'tersalin' ? 'Tersalin' : status === 'gagal' ? 'Gagal menyalin' : 'Salin'}
        </button>
        <button
          type="button"
          onClick={unduh}
          className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-medium text-ink transition hover:border-navy-soft hover:bg-navy-soft"
        >
          Unduh .md
        </button>
      </div>
    </CardShell>
  );
}
