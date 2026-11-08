import type { ReactNode } from 'react';

import type { Mode } from '../../types/app';
import Composer from './Composer';
import EmptyState from './EmptyState';
import ComingSoonCard from '../placeholders/ComingSoonCard';

type Props = {
  mode: Mode;
  onModeChange: (next: Mode) => void;
  onSend?: (text: string) => void;
  /** Isi thread percakapan. null = belum ada chat (M3 mengisi ini). */
  thread?: ReactNode;
};

/**
 * Area utama tengah. Semua cabang memakai pola sama:
 *   [area scroll (bubbles/placeholder)]  <- flex-1, overflow-y-auto
 *   [composer]                           <- div terpisah, selalu nempel di bawah
 * sehingga saat guliran di area chat, hanya bubble yang bergerak.
 *
 * - mode dokumen  -> placeholder "Fitur akan datang"
 * - ada thread    -> daftar pesan
 * - thread kosong -> sapaan + composer di tengah
 */
export default function MainArea({ mode, onModeChange, onSend, thread }: Props) {
  // Mode dokumen masih placeholder — pesan tidak dikirim ke backend.
  const composer = (
    <Composer
      mode={mode}
      onModeChange={onModeChange}
      onSend={mode === 'chat' ? onSend : undefined}
      autoFocus
    />
  );

  const composerDock = (
    <div className="border-t border-line bg-surface px-6 py-3">
      <div className="mx-auto max-w-3xl">{composer}</div>
    </div>
  );

  if (mode === 'dokumen') {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-12">
            <ComingSoonCard />
          </div>
        </div>
        {composerDock}
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
