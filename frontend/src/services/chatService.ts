import type { ChatResponse } from '../types/api';
import { postJSON } from './client';

/** POST /chat — kirim satu pesan pada satu sesi. */
export function kirimChat(sesi: string, pesan: string): Promise<ChatResponse> {
  return postJSON<ChatResponse>('/chat', { sesi, pesan });
}
