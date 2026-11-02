import type { ChatResponse } from '../../types/api';
import HasilCard from './HasilCard';
import KlarifikasiCard from './KlarifikasiCard';
import KetentuanCard from './KetentuanCard';

type Props = { payload: ChatResponse; onPilih: (teks: string) => void };

/** Pilih kartu berdasarkan field `mode` pada respons backend. */
export default function ResponseCards({ payload, onPilih }: Props) {
  switch (payload.mode) {
    case 'inferensi':
      return <HasilCard payload={payload} />;
    case 'retrieval':
      return <KetentuanCard payload={payload} />;
    case 'klarifikasi':
      return <KlarifikasiCard payload={payload} onPilih={onPilih} />;
    default:
      return null;
  }
}
