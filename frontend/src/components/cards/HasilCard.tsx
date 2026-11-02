import { formatRupiah, labelManusia } from '../../lib/text';
import type { ChatResponse } from '../../types/api';
import CardShell from './CardShell';
import { IconClock } from '../common/icons';

type Props = { payload: ChatResponse };

/** Respons `mode = "inferensi"`: hak, nominal, rincian hitungan, dasar hukum. */
export default function HasilCard({ payload }: Props) {
  const hak = payload.hak ?? [];
  const rincian = payload.rincian ?? {};
  const pasal = payload.pasal ?? [];
  const adaNominal = typeof payload.nominal === 'number' && payload.nominal > 0;

  if (hak.length === 0 && !adaNominal && pasal.length === 0) return null;

  return (
    <CardShell title="Hasil analisis" icon={<IconClock className="h-3.5 w-3.5" />}>
      {hak.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hak.map((item) => (
            <span
              key={item}
              className="rounded-full bg-navy-soft px-2.5 py-1 text-[12.5px] font-medium text-navy"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {adaNominal && (
        <div className="mt-3">
          <p className="text-[11.5px] uppercase tracking-wide text-ink-muted">Perkiraan nominal</p>
          <p className="text-[26px] font-semibold leading-tight text-navy">
            {formatRupiah(payload.nominal as number)}
          </p>
        </div>
      )}

      {Object.keys(rincian).length > 0 && (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-line pt-3 sm:grid-cols-2">
          {Object.entries(rincian).map(([kunci, nilai]) => (
            <div key={kunci} className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">{labelManusia(kunci)}</dt>
              <dd className="font-medium tabular-nums text-ink">{nilai}</dd>
            </div>
          ))}
        </dl>
      )}

      {pasal.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-[11.5px] uppercase tracking-wide text-ink-muted">Dasar hukum</p>
          <ul className="mt-1 space-y-1">
            {pasal.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-gold" aria-hidden="true">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardShell>
  );
}
