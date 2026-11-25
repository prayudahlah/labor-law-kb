import { useState } from 'react';

import ChatThread from './components/chat/ChatThread';
import MainArea from './components/chat/MainArea';
import DokumenEditor from './components/dokumen/DokumenEditor';
import DokumenEmptyState from './components/dokumen/DokumenEmptyState';
import SuratPhkEditor from './components/dokumen/SuratPhkEditor';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import { bacaChecklistLama } from './hooks/useChecklist';
import { useChat } from './hooks/useChat';
import { useDokumen } from './hooks/useDokumen';
import { useHealth } from './hooks/useHealth';
import { useRecents } from './hooks/useRecents';
import { badanDrafLama, bisaDraf, judulDokumen, kodeDokumen } from './lib/dokumen';
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
        header: entriDokumen.header ?? false,
        varian: entriDokumen.varian,
        suratTeks: entriDokumen.suratTeks ?? '',
        ringkasan: entriDokumen.ringkasan ?? '',
        drafTeks:
          entriDokumen.drafTeks ??
          entriDokumen.ringkasan ??
          (() => {
            const draf = entriDokumen.messages.find((pesan) => pesan.draf)?.draf;
            return draf ? badanDrafLama(draf.template) : '';
          })(),
      }
    : null;

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
        dokumen.muatHeader(item.header ?? false);
        dokumen.muatDrafTeks(
          item.drafTeks ??
            item.ringkasan ??
            (draf ? badanDrafLama(draf.template) : ''),
        );
        dokumen.muatSurat(item.suratTeks);
        dokumen.muatRingkasanTeks(item.ringkasan);
        dokumen.muatVarian(item.varian);
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
      const preset = dokumen.presets.find(
        (pilihan) => kodeDokumen(pilihan) === drafLama.dokumen,
      );
      if (preset) {
        chat.reset();
        dokumen.sesiBaru();
        dokumen.pilih(preset);
        dokumen.muatDraf(drafLama);
        dokumen.muatDrafTeks(badanDrafLama(drafLama.template));
        dokumen.muatJudul(drafLama.judul);
        setChecklistAwal([]);
        setActiveDokId(item.id);
        setActiveId(item.id);
        setThreadMode(null);
        setMode('dokumen');
        return;
      }
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
    // Sesi kerja baru: centang dari dokumen sebelumnya tidak boleh ikut terbawa.
    dokumen.sesiBaru();
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
    suratTeks?: string;
    varian?: string;
  }) => {
    if (!dokumen.preset || !idDokumenSesi) return;

    const template = bisaDraf(dokumen.preset);
    const suratPhk = dokumen.preset.id === 'DokumenSuratPHK';
    const namaPekerja = (dokumen.fakta.nama_pekerja ?? '').trim();
    const judul = (
      tambahan.judul ??
      (template
        ? judulDokumen(dokumen.preset.nama, dokumen.fakta.nama_perusahaan ?? '')
        : suratPhk
          ? namaPekerja
            ? `Surat PHK — ${namaPekerja}`
            : dokumen.preset.nama
          : dokumen.judul)
    ).trim();
    if (!judul) return;

    const lama = entriDokumen;
    const draf =
      tambahan.draf ?? dokumen.draf ?? lama?.messages.find((pesan) => pesan.draf)?.draf;
    const teksRingkasan = suratPhk
      ? tambahan.ringkasan ?? dokumen.ringkasanTeks ?? lama?.ringkasan
      : tambahan.ringkasan ?? dokumen.ringkasan ?? lama?.ringkasan;
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
      fakta: template || suratPhk ? { ...dokumen.fakta } : {},
      title: judul,
      updatedAt: Date.now(),
      messages: pesan,
      pasal,
      drafTeks: tambahan.drafTeks ?? dokumen.drafTeks,
      suratTeks: suratPhk
        ? tambahan.suratTeks ?? dokumen.suratTeks
        : lama?.suratTeks,
      varian: suratPhk ? tambahan.varian ?? dokumen.varian : undefined,
      ringkasan: teksRingkasan,
      header: template || suratPhk ? undefined : dokumen.headerAktif,
    });
    setActiveDokId(idDokumenSesi);
    setActiveId(idDokumenSesi);
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
  const adaHasilDokumen = Boolean(dokumen.draf) || Boolean(dokumen.drafTeks.trim());
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
              dokumen.preset.id === 'DokumenSuratPHK' ? (
                <SuratPhkEditor
                  key={dokumen.sesiKerja}
                  preset={dokumen.preset}
                  butir={dokumen.butir}
                  loadingButir={dokumen.loadingButir}
                  butirError={dokumen.butirError}
                  fakta={dokumen.fakta}
                  onUbahFakta={dokumen.ubahFakta}
                  varian={dokumen.varian}
                  onUbahVarian={dokumen.ubahVarian}
                  fieldsSurat={dokumen.fieldsSurat}
                  suratTeks={dokumen.suratTeks}
                  onUbahSurat={dokumen.ubahSuratTeks}
                  ringkasan={dokumen.ringkasanTeks}
                  onUbahRingkasan={dokumen.ubahRingkasanTeks}
                  loadingSurat={dokumen.loadingSurat}
                  suratError={dokumen.suratError}
                  onSusunSurat={async () =>
                    Boolean(await dokumen.susunSurat(chat.sesi))
                  }
                  sesiChecklist={sesiChecklist}
                  awalChecklist={checklistAwal}
                  onSimpan={(pasal) =>
                    void simpanDokumen({
                      pasal,
                      suratTeks: dokumen.suratTeks,
                      ringkasan: dokumen.ringkasanTeks,
                      varian: dokumen.varian,
                    })
                  }
                  onKembali={dokumen.kembali}
                  entriTersimpan={entriTersimpan}
                />
              ) : (
                <DokumenEditor
                  preset={dokumen.preset}
                  butir={dokumen.butir}
                  loadingButir={dokumen.loadingButir}
                  butirError={dokumen.butirError}
                  fakta={dokumen.fakta}
                  onUbahFakta={dokumen.ubahFakta}
                  drafTeks={dokumen.drafTeks}
                  onUbahDrafTeks={dokumen.ubahDrafTeks}
                  judul={dokumen.judul}
                  onUbahJudul={dokumen.ubahJudul}
                  headerAktif={dokumen.headerAktif}
                  onUbahHeader={dokumen.ubahHeaderAktif}
                  sesiChecklist={sesiChecklist}
                  awalChecklist={checklistAwal}
                  onSimpan={(pasal) =>
                    void simpanDokumen({ drafTeks: dokumen.drafTeks, pasal })
                  }
                  onKembali={dokumen.kembali}
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
