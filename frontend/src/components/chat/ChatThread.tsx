import { useEffect, useRef } from 'react';

import type { ChatMessage } from '../../types/chat';
import ErrorCard from '../cards/ErrorCard';
import ResponseCards from '../cards/ResponseCards';
import MessageBubble from './MessageBubble';

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  error?: string | null;
  /** Sesuai `sesi` backend — dipakai mendeteksi ganti thread (buka riwayat). */
  sesi: string;
  onPilih: (teks: string) => void;
};

/**
 * Daftar pesan + kartu respons + indikator mengetik + galat terakhir.
 * Elemen scroll-nya ada di sini (bukan di MainArea) supaya auto-scroll
 * bisa mengukur tinggi konten sendiri.
 */
export default function ChatThread({ messages, loading, error, sesi, onPilih }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sesiSebelumnya = useRef(sesi);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const gantiThread = sesiSebelumnya.current !== sesi;
    sesiSebelumnya.current = sesi;

    const terakhir = messages[messages.length - 1];
    const baruKirim = terakhir?.role === 'user';
    const dekatBawah = el.scrollHeight - el.scrollTop - el.clientHeight < 120;

    // Baru kirim / ganti thread -> selalu ke bawah.
    // Balasan masuk -> hanya bila pengguna memang sudah di dekat bawah,
    // supaya guliran ke atas tidak pernah ditarik paksa.
    if (gantiThread || baruKirim || dekatBawah) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading, sesi]);

  return (
    <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-6">
        {messages.map((message) => {
          const adaTeks = message.text.trim().length > 0;
          return (
            <div key={message.id} className="flex flex-col gap-2">
              {adaTeks && <MessageBubble message={message} />}
              {message.payload && <ResponseCards payload={message.payload} onPilih={onPilih} />}
            </div>
          );
        })}

        {loading && <TypingBubble />}

        {!loading && error && <ErrorCard pesan={error} />}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-light"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
        <span className="sr-only">Sedang menjawab…</span>
      </div>
    </div>
  );
}
