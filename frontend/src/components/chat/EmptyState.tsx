import type { Mode } from '../../types/app';
import { GREETING_ACCENT, GREETING_LEAD } from '../../config/constants';
import Composer from './Composer';

type Props = {
  mode: Mode;
  onModeChange: (next: Mode) => void;
  onSend?: (text: string) => void;
};

/** Layar kosong: blob gradien + sapaan + composer di tengah. */
export default function EmptyState({ mode, onModeChange, onSend }: Props) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <div className="blob h-16 w-16 rounded-full" aria-hidden="true" />
          <h1 className="mt-7 text-[30px] font-semibold leading-tight tracking-tight text-ink sm:text-[38px]">
            {GREETING_LEAD} <span className="text-gold-text">{GREETING_ACCENT}</span>
          </h1>
          <p className="mt-2 text-[14px] text-ink-muted">
            Tanyakan hak Anda, hitung pesangon/lembur, atau telusuri ketentuan.
          </p>
        </div>

        <div className="mt-8">
          <Composer mode={mode} onModeChange={onModeChange} onSend={onSend} autoFocus />
        </div>
      </div>
    </div>
  );
}
