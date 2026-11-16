import type { ReactNode } from 'react';

import type { Mode } from '../../types/app';
import Composer from './Composer';
import EmptyState from './EmptyState';
import ModeChips from './ModeChips';

type Props = {
  mode: Mode;
  onModeChange: (next: Mode) => void;
  onSend?: (text: string) => void;
  /** Isi thread percakapan. null = belum ada chat (M3 mengisi ini). */
  thread?: ReactNode;
  /** Percakapan sudah berjalan: chip mode di composer dikunci. */
  modeLocked?: boolean;
  /** Mode dokumen: layar awal (di tengah) sebelum dokumen dipilih. */
  dokumenKosong: ReactNode;
  /** Mode dokumen: panel setelah dokumen dipilih. */
  dokumenPanel?: ReactNode;
};

/**
 * Area utama tengah. Semua cabang memakai pola sama:
 *   [area scroll (bubbles/placeholder)]  <- flex-1, overflow-y-auto
 *   [composer]                           <- div terpisah, selalu nempel di bawah
 * sehingga saat guliran di area chat, hanya bubble yang bergerak.
 *
 * - mode dokumen, belum pilih -> layar tengah (seperti sapaan chat)
 * - mode dokumen, sudah pilih -> panel + chip mode menempel di bawah
 * - ada thread    -> daftar pesan
 * - thread kosong -> sapaan + composer di tengah
 */
export default function MainArea({
  mode,
  onModeChange,
  onSend,
  thread,
  modeLocked,
  dokumenKosong,
  dokumenPanel,
}: Props) {
  const composer = (
    <Composer
      mode={mode}
      onModeChange={onModeChange}
      onSend={mode === 'chat' ? onSend : undefined}
      autoFocus
      locked={modeLocked}
    />
  );

  const composerDock = (
    <div className="px-6 py-3">
      <div className="mx-auto max-w-3xl">{composer}</div>
    </div>
  );

  if (mode === 'dokumen') {
    if (!dokumenPanel) {
      return (
        <main className="scroll-slim min-h-0 flex-1 overflow-y-auto">{dokumenKosong}</main>
      );
    }

    return (
      <main className="flex min-h-0 flex-1 flex-col">
        {dokumenPanel}
        <div className="py-2.5">
          <div className="mx-auto flex max-w-5xl items-center px-6">
            <ModeChips value={mode} onChange={onModeChange} disabled={modeLocked} />
          </div>
        </div>
      </main>
    );
  }

  if (thread) {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        {thread}
        {composerDock}
      </main>
    );
  }

  return (
    <main className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <EmptyState mode={mode} onModeChange={onModeChange} onSend={onSend} />
    </main>
  );
}
