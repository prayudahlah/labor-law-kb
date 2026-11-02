import type { Mode } from './app';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
  /** Respons utuh dari backend — dipakai untuk merender kartu hasil (M3). */
  payload?: import('./api').ChatResponse;
};

export type Recent = {
  /** = sesi di backend */
  id: string;
  mode: Mode;
  /** Judul otomatis dari pesan pertama (40 karakter). */
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};
