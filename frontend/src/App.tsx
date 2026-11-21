import { useState } from 'react';

import ChatThread from './components/chat/ChatThread';
import MainArea from './components/chat/MainArea';
import DokumenEditor from './components/dokumen/DokumenEditor';
import DokumenEmptyState from './components/dokumen/DokumenEmptyState';
import DokumenPanel from './components/dokumen/DokumenPanel';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import { bacaChecklistLama } from './hooks/useChecklist';
import { useChat } from './hooks/useChat';
import { useDokumen } from './hooks/useDokumen';
import { useHealth } from './hooks/useHealth';
import { useRecents } from './hooks/useRecents';
import { badanDrafLama, bisaDraf, judulDokumen } from './lib/dokumen';
import { potong } from './lib/text';
import type { Mode } from './types/app';
import type { DokumenResponse } from './types/api';
import type { ChatMessage } from './types/chat';

export default function App() {
  const recents = useRecents();
  const chat = useChat();
  const dokumen = useDokumen();
  const health = useHealth();

  const [mode, setMode] = useState<Mode>('chat');
  const [activeId, setActiveId] = useState<string | null>(null);
  /** Mode saat thread dibuka — thread hanya tampil bila masih cocok dengan chip mode. */
  const [threadMode, setThreadMode] = useState<Mode | null>(null);
  /** Entri riwayat yang sedang diedit (agar Simpan menimpa, bukan menduplikasi). */
  const [activeDokId, setActiveDokId] = useState<string | null>(null);
  /** Centang awal dari entri riwayat yang dibuka. */
  const [checklistAwal, setChecklistAwal] = useState<string[] | null>(null);

  const sesiChecklist = dokumen.preset
    ? `${dokumen.sesiKerja}:${dokumen.preset.id}`
    : null;
  const idDokumenSesi = dokumen.preset
    ? activeDokId ?? `dok-${dokumen.preset.id}-${dokumen.sesiKerja}`
    : null;
  const entriDokumen = idDokumenSesi
    ? recents.items.find((item) => item.id === idDokumenSesi)
    : undefined;
  const entriTersimpan = entriDokumen
    ? {
        judul: entriDokumen.title,
        pasal: entriDokumen.pasal ?? [],
        fakta: entriDokumen.fakta ?? {},
        ringkasan: entriDokumen.ringkasan ?? null,
        drafTemplate:
          entriDokumen.messages.find((pesan) => pesan.draf)?.draf?.template ?? null,
      }
    : null;

  /** Dokumen bertemplat memakai editor, bukan panel checklist. */
  const pakaiEditor = dokumen.preset ? bisaDraf(dokumen.preset) : false;

  const bukaBaru = () => {
    chat.reset();
    dokumen.reset();
    setActiveId(null);
    setThreadMode(null);
    setActiveDokId(null);
    setChecklistAwal(null);
    setMode('chat');
  };

  const bukaRecent = (id: string) => {
    const item = recents.items.find((recent) => recent.id === id);
    if (!item) return;

    // Entri dokumen: buka panelnya lagi (dokumen, judul, centang, draf, ringkasan).
    if (item.dokumenId) {
      const preset = dokumen.presets.find((pilihan) => pilihan.id === item.dokumenId);
      if (preset) {
        chat.reset();
        dokumen.sesiBaru();
        dokumen.pilih(preset);
        const draf = item.messages.find((pesan) => pesan.draf)?.draf;
        if (draf) dokumen.muatDraf(draf);
        if (item.fakta) dokumen.muatFakta(item.fakta);
        dokumen.muatJudul(item.title);
        dokumen.muatDrafTeks(
          item.drafTeks ?? (draf ? badanDrafLama(draf.template) : ''),
        );
        if (item.ringkasan) {
          dokumen.muatRingkasan(
            item.ringkasan,
            [...(item.pasal ?? [])].sort().join('\n'),
          );
        }
        setChecklistAwal(item.pasal ?? bacaChecklistLama(item.dokumenId));
        setActiveDokId(item.id);
        setActiveId(item.id);
        setThreadMode(null);
        setMode('dokumen');
        return;
      }
    }

    // Entri dokumen lama (belum punya dokumenId).
    const drafLama = item.messages.find((pesan) => pesan.draf)?.draf;
    if (item.mode === 'dokumen' && drafLama) {
      chat.reset();
      dokumen.reset();
      dokumen.muatDraf(drafLama);
      setActiveDokId(item.id);
      setActiveId(item.id);
      setThreadMode(null);
      setMode('dokumen');
      return;
    }

    dokumen.reset();
    setActiveDokId(null);
    setChecklistAwal(null);
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
    if (next === 'dokumen') {
      dokumen.reset();
      setActiveId(null);
      setActiveDokId(null);
      setChecklistAwal(null);
    }
    setMode(next);
  };

  const pilihDokumen = (preset: Parameters<typeof dokumen.pilih>[0]) => {
    setActiveDokId(null);
    setChecklistAwal(null);
    dokumen.pilih(preset);
  };

  const hapusSemuaRecent = async () => {
    if (!window.confirm('Hapus semua riwayat?')) return;
    await recents.clear();
    bukaBaru();
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

  /**
   * Simpan pekerjaan dokumen ke riwayat. Satu entri per sesi kerja
   * (`dok-<jenis>-<sesi>`), menyimpan judul, fakta, centang, draf, ringkasan.
   */
  const simpanDokumen = async (tambahan: {
    draf?: DokumenResponse;
    ringkasan?: string;
    ditandai?: number;
    pasal?: string[];
    judul?: string;
    drafTeks?: string;
  }) => {
    if (!dokumen.preset || !idDokumenSesi) return;

    const editor = bisaDraf(dokumen.preset);
    const judul = (
      tambahan.judul ??
      (editor
        ? judulDokumen(dokumen.preset.nama, dokumen.fakta.nama_perusahaan ?? '')
        : dokumen.judul)
    ).trim();
    if (!judul) return;

    const lama = entriDokumen;
    const draf =
      tambahan.draf ?? dokumen.draf ?? lama?.messages.find((pesan) => pesan.draf)?.draf;
    const teksRingkasan = tambahan.ringkasan ?? dokumen.ringkasan ?? lama?.ringkasan;
    const pasal = tambahan.pasal ?? lama?.pasal;

    const pesan: ChatMessage[] = draf
      ? [
          {
            id: `${draf.dokumen}-${Date.now()}`,
            role: 'assistant',
            text: draf.judul,
            draf,
            createdAt: Date.now(),
          },
        ]
      : [];

    await recents.save({
      id: idDokumenSesi,
      mode: 'dokumen',
      dokumenId: dokumen.preset.id,
      fakta: { ...dokumen.fakta },
      title: judul,
      updatedAt: Date.now(),
      messages: pesan,
      pasal,
      drafTeks: tambahan.drafTeks ?? dokumen.drafTeks,
      ringkasan: teksRingkasan,
    });
    setActiveDokId(idDokumenSesi);
    setActiveId(idDokumenSesi);
  };

  const susunDraf = async () => {
    await dokumen.susun(chat.sesi);
  };

  const buatRingkasan = (
    teks: string,
    jumlahTanda: number,
    pasal: string[],
    judul: string,
    dasar: string,
  ) => {
    dokumen.tampilkanRingkasan(teks, dasar);
    void simpanDokumen({ ringkasan: teks, ditandai: jumlahTanda, pasal, judul });
  };

  // Thread chat hanya dirender di mode chat dan hanya untuk thread chat.
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

  // Chat terkunci setelah percakapan dimulai; dokumen terkunci setelah ada
  // draf atau ringkasan.
  const adaHasilDokumen = Boolean(dokumen.draf) || Boolean(dokumen.ringkasan);
  const modeLocked = mode === 'chat' ? chat.messages.length > 0 : adaHasilDokumen;

  /** Hapus entri riwayat; kalau entri itu sedang terbuka, kembali ke New Chat. */
  const hapusRecent = async (id: string) => {
    if (
      !window.confirm('Hapus riwayat ini? Tindakan ini tidak bisa dibatalkan.')
    ) {
      return;
    }
    await recents.hapus(id);
    if (activeId === id) bukaBaru();
  };

  return (
    <div className="flex h-full min-h-screen bg-bg">
      <Sidebar
        recents={recents}
        activeId={activeId}
        onOpen={bukaRecent}
        onHapus={hapusRecent}
        onHapusSemua={hapusSemuaRecent}
        onNewChat={bukaBaru}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar health={health} onNewChat={bukaBaru} />
        <MainArea
          mode={mode}
          onModeChange={gantiMode}
          onSend={kirim}
          thread={thread}
          modeLocked={modeLocked}
          dokumenKosong={
            <DokumenEmptyState
              mode={mode}
              onModeChange={gantiMode}
              presets={dokumen.presets}
              loading={dokumen.loadingPresets}
              error={dokumen.presetsError}
              onPilih={pilihDokumen}
            />
          }
          dokumenPanel={
            dokumen.preset ? (
              pakaiEditor ? (
                <DokumenEditor
                  preset={dokumen.preset}
                  butir={dokumen.butir}
                  loadingButir={dokumen.loadingButir}
                  butirError={dokumen.butirError}
                  fakta={dokumen.fakta}
                  onUbahFakta={dokumen.ubahFakta}
                  drafTeks={dokumen.drafTeks}
                  onUbahDrafTeks={dokumen.ubahDrafTeks}
                  onSimpan={() => void simpanDokumen({ drafTeks: dokumen.drafTeks })}
                  onKembali={dokumen.kembali}
                  entriTersimpan={
                    entriDokumen
                      ? {
                          fakta: entriDokumen.fakta ?? {},
                          drafTeks: entriDokumen.drafTeks ?? '',
                        }
                      : null
                  }
                />
              ) : (
                <DokumenPanel
                  preset={dokumen.preset}
                  butir={dokumen.butir}
                  loadingButir={dokumen.loadingButir}
                  butirError={dokumen.butirError}
                  fakta={dokumen.fakta}
                  onUbahFakta={dokumen.ubahFakta}
                  onSusun={susunDraf}
                  loadingDraf={dokumen.loadingDraf}
                  drafError={dokumen.drafError}
                  draf={dokumen.draf}
                  onKembali={dokumen.kembali}
                  ringkasan={dokumen.ringkasan}
                  ringkasanTampil={dokumen.ringkasanTampil}
                  ringkasanAwal={dokumen.ringkasanAwal}
                  ringkasanDasar={dokumen.ringkasanDasar}
                  onBuatRingkasan={buatRingkasan}
                  onUbahRingkasan={dokumen.ubahRingkasan}
                  onBukaRingkasan={dokumen.bukaRingkasan}
                  onSembunyikanRingkasan={dokumen.sembunyikanRingkasan}
                  judul={dokumen.judul}
                  onUbahJudul={dokumen.ubahJudul}
                  sesiChecklist={sesiChecklist}
                  awalChecklist={checklistAwal}
                  onSimpan={(jumlah, pasal, judul) =>
                    void simpanDokumen({ ditandai: jumlah, pasal, judul })
                  }
                  entriTersimpan={entriTersimpan}
                />
              )
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
