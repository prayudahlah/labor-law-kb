import { FIELD_LABEL } from '../../config/constants';
import { labelManusia } from '../../lib/text';
import type { ChatResponse } from '../../types/api';
import CardShell from './CardShell';
import { IconChat } from '../common/icons';

type Props = { payload: ChatResponse; onPilih: (teks: string) => void };

/**
 * Respons `mode = "clarification"`: menampilkan pilihan yang bisa diklik
 * dan daftar data yang masih kurang.
 */
export default function KlarifikasiCard({ payload, onPilih }: Props) {
  const pilihan = payload.pilihan ?? [];
  const kurang = payload.kurang ?? payload.slot?.kurang ?? [];

  if (pilihan.length === 0 && kurang.length === 0) return null;

  return (
    <CardShell title="Perlu klarifikasi" icon={<IconChat className="h-3.5 w-3.5" />}>
      {pilihan.length > 0 && (
        <div>
          <p className="text-ink-muted">Pilih salah satu:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {pilihan.map((opsi) => (
              <button
                key={opsi}
                type="button"
                onClick={() => onPilih(opsi)}
                className="rounded-full border border-navy bg-surface px-2.5 py-1 text-[12.5px] font-medium text-navy transition hover:bg-navy hover:text-ink-inverse"
              >
                {opsi}
              </button>
            ))}
          </div>
        </div>
      )}

      {kurang.length > 0 && (
        <div className={pilihan.length > 0 ? 'mt-3 border-t border-line pt-3' : ''}>
          <p className="text-ink-muted">Data yang perlu dilengkapi:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {kurang.map((field) => (
              <span
                key={field}
                className="rounded-full bg-gold-soft px-2.5 py-1 text-[12.5px] font-medium text-gold-text"
                title={field}
              >
                {FIELD_LABEL[field] ?? labelManusia(field)}
              </span>
            ))}
          </div>
        </div>
      )}
    </CardShell>
  );
}
