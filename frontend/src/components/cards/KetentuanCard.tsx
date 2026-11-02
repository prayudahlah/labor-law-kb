import { labelManusia } from '../../lib/text';
import type { ChatResponse } from '../../types/api';
import CardShell from './CardShell';
import { IconDoc } from '../common/icons';

type Props = { payload: ChatResponse };

/** Respons `mode = "retrieval"`: tabel daftar ketentuan per topik. */
export default function KetentuanCard({ payload }: Props) {
  const butir = payload.butir ?? [];
  const topik = (payload.scope?.topik as string[] | undefined) ?? [];

  return (
    <CardShell
      title={`Ketentuan${topik.length > 0 ? ` · ${topik.join(', ')}` : ''}`}
      icon={<IconDoc className="h-3.5 w-3.5" />}
    >
      {butir.length === 0 ? (
        <p className="text-ink-muted">Tidak ada ketentuan ditemukan.</p>
      ) : (
        <>
          <p className="mb-2 text-ink-muted">
            {butir.length} ketentuan ditemukan.
          </p>
          <div className="-mx-3.5 overflow-x-auto px-3.5">
            <table className="w-full border-collapse text-left align-top">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="py-1.5 pr-3 font-semibold">Topik</th>
                  <th className="py-1.5 pr-3 font-semibold">Pasal</th>
                  <th className="py-1.5 font-semibold">Ketentuan</th>
                </tr>
              </thead>
              <tbody>
                {butir.map((item, index) => (
                  <tr
                    key={`${item.norma}-${index}`}
                    className="border-b border-line align-top last:border-b-0"
                  >
                    <td className="py-2 pr-3 text-ink-muted">{item.topik}</td>
                    <td className="py-2 pr-3 font-medium text-ink">{item.pasal}</td>
                    <td className="py-2 text-ink">{labelManusia(item.norma)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardShell>
  );
}
