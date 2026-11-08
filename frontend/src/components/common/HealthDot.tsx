import type { HealthStatus } from '../../types/app';
import { cx } from '../../lib/cx';

const TONE: Record<HealthStatus, { dot: string; label: string }> = {
  ok: { dot: 'bg-success', label: 'Backend terhubung' },
  error: { dot: 'bg-danger', label: 'Backend terputus' },
  pending: { dot: 'bg-line-strong', label: 'Memeriksa backend…' },
};

type Props = { status: HealthStatus };

/** Dot status backend tanpa teks — labelnya muncul sebagai tooltip hover. */
export default function HealthDot({ status }: Props) {
  const tone = TONE[status];
  return (
    <span
      className="grid h-6 w-6 place-items-center rounded-full border border-line bg-surface"
      title={tone.label}
      aria-label={tone.label}
    >
      <span className={cx('h-2 w-2 rounded-full', tone.dot)} />
    </span>
  );
}
