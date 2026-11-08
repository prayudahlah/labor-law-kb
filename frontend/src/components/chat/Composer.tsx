import { useRef, useState } from 'react';

import type { Mode } from '../../types/app';
import { PLACEHOLDER_TEXT } from '../../config/constants';
import { IconSend } from '../common/icons';
import ModeChips from './ModeChips';

type Props = {
  mode: Mode;
  onModeChange: (next: Mode) => void;
  onSend?: (text: string) => void;
  autoFocus?: boolean;
};

/**
 * Kotak isian pesan. Berada di tengah saat thread masih kosong,
 * turun ke bawah setelah percakapan dimulai (posisi diatur pemiliknya).
 */
export default function Composer({ mode, onModeChange, onSend, autoFocus }: Props) {
  const [text, setText] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = text.trim().length > 0 && Boolean(onSend);

  const grow = () => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, 176)}px`;
  };

  const send = () => {
    const value = text.trim();
    if (!value || !onSend) return;
    onSend(value);
    setText('');
    requestAnimationFrame(() => {
      if (areaRef.current) areaRef.current.style.height = 'auto';
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <div className="w-full rounded-2xl border border-line bg-surface shadow-card transition focus-within:border-navy-light">
      <textarea
        ref={areaRef}
        rows={1}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          grow();
        }}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDER_TEXT}
        aria-label="Pesan"
        className="block max-h-44 w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[14px] leading-6 text-ink outline-none placeholder:text-ink-muted"
      />

      <div className="flex items-center gap-2 px-2.5 pb-2.5">
        <ModeChips value={mode} onChange={onModeChange} />

        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          title="Kirim (Enter)"
          aria-label="Kirim pesan"
          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-ink-inverse transition hover:bg-navy-hover disabled:bg-line-strong disabled:text-surface"
        >
          <IconSend className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
