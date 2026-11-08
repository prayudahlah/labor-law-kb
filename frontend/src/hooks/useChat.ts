import { useCallback, useState } from 'react';

import { kirimChat } from '../services/chatService';
import type { ChatResponse } from '../types/api';
import type { ChatMessage, Recent } from '../types/chat';

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Kalimat ringkas dari respons backend, dipakai sebagai isi bubble. */
function teksJawaban(res: ChatResponse): string {
  return (res.narasi ?? res.pertanyaan ?? res.pesan ?? '').trim();
}

/**
 * Percakapan aktif: sesi, daftar pesan, status kirim, dan galat.
 * Recents (riwayat) ditangani terpisah oleh useRecents.
 */
export function useChat() {
  const [sesi, setSesi] = useState<string>(() => uid());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Kirim pesan. Mengembalikan seluruh thread setelah terkirim, atau null bila gagal. */
  const kirim = useCallback(
    async (pesan: string): Promise<ChatMessage[] | null> => {
      setLoading(true);
      setError(null);

      const sebelum = messages;
      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        text: pesan,
        createdAt: Date.now(),
      };
      setMessages([...sebelum, userMsg]);

      try {
        const res = await kirimChat(sesi, pesan);
        const assistantMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          text: teksJawaban(res),
          payload: res,
          createdAt: Date.now(),
        };
        const akhir = [...sebelum, userMsg, assistantMsg];
        setMessages(akhir);
        return akhir;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [messages, sesi],
  );

  /** Buka thread dari riwayat — sesi mengikuti id recents. */
  const muatThread = useCallback((item: Recent) => {
    setSesi(item.id);
    setMessages(item.messages);
    setError(null);
    setLoading(false);
  }, []);

  /** Sesi + thread baru. */
  const reset = useCallback(() => {
    setSesi(uid());
    setMessages([]);
    setError(null);
    setLoading(false);
  }, []);

  return { sesi, messages, loading, error, kirim, muatThread, reset };
}

export type ChatApi = ReturnType<typeof useChat>;
