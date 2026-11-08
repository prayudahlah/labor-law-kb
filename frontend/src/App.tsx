import { useState } from 'react';

import ChatThread from './components/chat/ChatThread';
import MainArea from './components/chat/MainArea';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import { useChat } from './hooks/useChat';
import { useHealth } from './hooks/useHealth';
import { useRecents } from './hooks/useRecents';
import { potong } from './lib/text';
import type { Mode } from './types/app';

export default function App() {
  const recents = useRecents();
  const chat = useChat();
  const health = useHealth();

  const [mode, setMode] = useState<Mode>('chat');
  const [activeId, setActiveId] = useState<string | null>(null);
  /** Mode saat thread dibuka — thread hanya tampil bila masih cocok dengan chip mode. */
  const [threadMode, setThreadMode] = useState<Mode | null>(null);

  const bukaBaru = () => {
    chat.reset();
    setActiveId(null);
    setThreadMode(null);
    setMode('chat');
  };

  const bukaRecent = (id: string) => {
    const item = recents.items.find((recent) => recent.id === id);
    if (!item) return;
    chat.muatThread(item);
    setActiveId(item.id);
    setThreadMode(item.mode);
    setMode(item.mode);
  };

  /**
   * Ganti mode. Bila sedang ada thread terbuka, ini dianggap memulai kanvas
   * baru (thread lama tetap tersimpan di riwayat).
   */
  const gantiMode = (next: Mode) => {
    if (next === mode) return;
    if (chat.messages.length > 0) {
      chat.reset();
      setActiveId(null);
      setThreadMode(null);
    }
    setMode(next);
  };

  const kirim = async (teks: string) => {
    const tersimpan = recents.items.find((recent) => recent.id === chat.sesi);

    // Thread (dan kartu galat bila gagal) harus langsung terlihat.
    if (activeId !== chat.sesi) {
      setActiveId(chat.sesi);
      setThreadMode(mode);
    }

    const hasil = await chat.kirim(teks);
    if (!hasil) return;

    await recents.save({
      id: chat.sesi,
      mode,
      title: tersimpan ? tersimpan.title : potong(teks),
      updatedAt: Date.now(),
      messages: hasil,
    });
  };

  // Mode dokumen selalu menampilkan placeholder, jadi thread hanya dirender
  // di mode chat dan hanya ketika thread tersebut memang milik mode chat.
  const thread =
    mode === 'chat' && threadMode === 'chat' && chat.messages.length > 0 ? (
      <ChatThread
        messages={chat.messages}
        loading={chat.loading}
        error={chat.error}
        sesi={chat.sesi}
        onPilih={kirim}
      />
    ) : undefined;

  return (
    <div className="flex h-full min-h-screen bg-bg">
      <Sidebar recents={recents} activeId={activeId} onOpen={bukaRecent} onNewChat={bukaBaru} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar health={health} onNewChat={bukaBaru} />
        <MainArea mode={mode} onModeChange={gantiMode} onSend={kirim} thread={thread} />
      </div>
    </div>
  );
}
