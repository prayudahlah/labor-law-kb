package ac.id.uns.kbr.kb;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import ac.id.uns.kbr.api.dto.ButirKetentuan;
import ac.id.uns.kbr.api.dto.ChatResponse;
import ac.id.uns.kbr.api.dto.InferRequest;
import ac.id.uns.kbr.api.dto.InferResponse;
import ac.id.uns.kbr.api.dto.Slot;
import ac.id.uns.kbr.api.dto.SlotField;

@Service
public class ChatService {

    private static final List<String> INFER_TOPIK =
            List.of("PHK", "Lembur", "Cuti", "PKWT", "Jamsos", "KIA");
    private static final List<String> PREFERENSI =
            List.of("KIA", "PKWT", "Lembur", "PHK", "Cuti", "Jamsos");

    private static final Map<String, String> TOPIK_SINONIM = Map.ofEntries(
            Map.entry("melahirkan", "KIA"),
            Map.entry("cuti melahirkan", "KIA"),
            Map.entry("kia", "KIA"),
            Map.entry("hamil", "KIA"),
            Map.entry("di-phk", "PHK"),
            Map.entry("diphk", "PHK"),
            Map.entry("di phk", "PHK"),
            Map.entry("phk", "PHK"),
            Map.entry("pesangon", "PHK"),
            Map.entry("pemutusan hubungan kerja", "PHK"),
            Map.entry("lembur", "Lembur"),
            Map.entry("cuti", "Cuti"),
            Map.entry("kontrak", "PKWT"),
            Map.entry("pkwt", "PKWT"),
            Map.entry("bpjs", "Jamsos"),
            Map.entry("jamsos", "Jamsos"),
            Map.entry("jaminan sosial", "Jamsos"),
            Map.entry("upah minimum", "Upah"),
            Map.entry("upah", "Upah"),
            Map.entry("gaji", "Upah"),
            Map.entry("waktu kerja", "WaktuKerja"),
            Map.entry("jam kerja", "WaktuKerja"),
            Map.entry("alih daya", "AlihDaya"),
            Map.entry("outsourcing", "AlihDaya"));

    private static final List<String> INDIKATOR_RETRIEVAL = List.of(
            "apa saja", "perlu apa", "apa yang perlu", "aturan", "ketentuan",
            "syarat", "daftar", "wajib memuat", "harus ada");
    private static final List<String> INDIKATOR_INFERENSI = List.of(
            "hak saya", "hakku", "berhak", "apa yang saya dapat", "berapa",
            "saya di-phk", "saya diphk", "saya di phk", "digaji", "gaji saya",
            "upah saya", "lembur saya", "saya kerja", "saya bekerja", "saya kena");

    private static final Map<String, String> ALASAN_SINONIM = Map.ofEntries(
            Map.entry("rugi", "EfisiensiRugi"),
            Map.entry("efisiensi", "EfisiensiRugi"),
            Map.entry("resign", "MengundurkanDiri"),
            Map.entry("mengundurkan diri", "MengundurkanDiri"),
            Map.entry("pensiun", "Pensiun"),
            Map.entry("meninggal", "MeninggalDunia"),
            Map.entry("pailit", "Pailit"),
            Map.entry("bangkrut", "Pailit"),
            Map.entry("mangkir", "Mangkir"),
            Map.entry("pelanggaran", "PelanggaranSP"));

    private static final Map<String, String> PERISTIWA_SINONIM = Map.ofEntries(
            Map.entry("menikah", "CutiMenikah"),
            Map.entry("menikahkan", "CutiMenikahkanAnak"),
            Map.entry("khitan", "CutiKhitanAnak"),
            Map.entry("baptis", "CutiBaptisAnak"),
            Map.entry("istri melahirkan", "CutiIstriMelahirkan"),
            Map.entry("keluarga meninggal", "CutiKeluargaMeninggal"),
            Map.entry("anggota serumah meninggal", "CutiAnggotaRumahMeninggal"));

    private static final Map<String, List<String>> INFER_REQUIRED = Map.of(
            "PHK", List.of("masaKerjaBulan", "upahBulanan", "alasanPHK"),
            "Lembur", List.of("jamLembur", "upahBulanan"),
            "Cuti", List.of("masaKerjaBulan"),
            "PKWT", List.of("masaKerjaBulan", "upahBulanan"),
            "Jamsos", List.of("upahBulanan"),
            "KIA", List.of("cutiMelahirkanBulan", "upahBulanan"));

    private static final Map<String, Integer> KATA_ANGKA = new LinkedHashMap<>();

    static {
        KATA_ANGKA.put("dua belas", 12);
        KATA_ANGKA.put("sebelas", 11);
        KATA_ANGKA.put("sepuluh", 10);
        KATA_ANGKA.put("satu", 1);
        KATA_ANGKA.put("dua", 2);
        KATA_ANGKA.put("tiga", 3);
        KATA_ANGKA.put("empat", 4);
        KATA_ANGKA.put("lima", 5);
        KATA_ANGKA.put("enam", 6);
        KATA_ANGKA.put("tujuh", 7);
        KATA_ANGKA.put("delapan", 8);
        KATA_ANGKA.put("sembilan", 9);
    }

    private final LlmRouter llmRouter;
    private final RetrievalService retrieval;
    private final InferenceService inference;
    private final NarasiService narasi;
    private final Map<String, Sesi> state = new ConcurrentHashMap<>();

    public ChatService(
            LlmRouter llmRouter,
            RetrievalService retrieval,
            InferenceService inference,
            NarasiService narasi) {
        this.llmRouter = llmRouter;
        this.retrieval = retrieval;
        this.inference = inference;
        this.narasi = narasi;
    }

    public ChatResponse jawab(String sesi, String pesan) {
        String sesiId = (sesi == null || sesi.isBlank()) ? "default" : sesi;
        String teks = pesan == null ? "" : pesan;
        Sesi st = state.computeIfAbsent(sesiId, key -> new Sesi());

        LlmRouter.Route route = llmRouter.route(teks, stateMap(st));
        List<String> detected = route != null && !route.topik().isEmpty()
                ? route.topik()
                : deteksiTopik(teks);
        Set<String> tersedia = new HashSet<>(retrieval.topikTersedia());
        detected = detected.stream()
                .filter(tersedia::contains)
                .distinct()
                .toList();

        String inferTopik = pilihTopikInfer(detected);
        Map<String, Object> routeFakta = route == null ? Map.of() : route.fakta();
        if (inferTopik == null && routeFakta.containsKey("alasanPHK")) {
            inferTopik = "PHK";
        }
        if (inferTopik == null && st.pending && st.topikInfer != null) {
            inferTopik = st.topikInfer;
        }

        Map<String, Object> heur = inferTopik == null
                ? Map.of()
                : ekstrak(inferTopik, teks);
        Map<String, Object> fakta = new LinkedHashMap<>(heur);
        fakta.putAll(routeFakta);

        if (inferTopik != null && !inferTopik.equals(st.topikInfer)) {
            st.fakta.clear();
            st.topikInfer = inferTopik;
        }
        fakta.forEach((key, value) -> {
            if (value != null) {
                st.fakta.put(key, value);
            }
        });
        st.topik.addAll(detected);

        String mode = route == null ? null : route.mode();
        if ("klarifikasi".equals(mode) && inferTopik != null) {
            if (!st.fakta.isEmpty() || adaIndikator(teks, INDIKATOR_INFERENSI)) {
                mode = "inferensi";
            } else if (!detected.isEmpty()) {
                mode = "retrieval";
            } else {
                mode = "inferensi";
            }
        }
        if (mode == null) {
            if (inferTopik != null
                    && (adaIndikator(teks, INDIKATOR_INFERENSI) || !st.fakta.isEmpty())) {
                mode = "inferensi";
            } else if (adaIndikator(teks, INDIKATOR_RETRIEVAL) || !detected.isEmpty()) {
                mode = "retrieval";
            } else {
                mode = "klarifikasi";
            }
        }
        if ("retrieval".equals(mode) && inferTopik != null
                && !adaIndikator(teks, INDIKATOR_RETRIEVAL)
                && (!st.fakta.isEmpty() || adaIndikator(teks, INDIKATOR_INFERENSI))) {
            mode = "inferensi";
        }

        if ("inferensi".equals(mode)) {
            if (inferTopik == null) {
                return klarifikasi("Ini soal hak pada topik apa?",
                        INFER_TOPIK, null, null, st);
            }
            List<String> kurang = kurang(inferTopik, st.fakta);
            if (!kurang.isEmpty()) {
                st.pending = true;
                return klarifikasi("Mohon lengkapi data berikut.",
                        null, kurang, slot(inferTopik, st.fakta, kurang), st);
            }
            Map<String, Object> faktaFinal = lengkapiDefault(inferTopik, st.fakta);
            InferResponse hasil = inference.infer(new InferRequest(inferTopik, faktaFinal));
            Slot slot = slot(inferTopik, faktaFinal, List.of());
            st.fakta.clear();
            st.topikInfer = null;
            st.pending = false;
            return new ChatResponse(
                    "inferensi", null, null, null, null, null,
                    hasil.hak(), hasil.rincian(), hasil.nominal(), hasil.pasal(), null,
                    hasil.narasi(), slot, stateMap(st), hasil.catatan());
        }

        if ("retrieval".equals(mode)) {
            List<String> scope = st.topik.isEmpty()
                    ? new ArrayList<>(detected)
                    : new ArrayList<>(st.topik);
            if (scope.isEmpty()) {
                return klarifikasi("Dokumen/aturan tentang topik apa?",
                        retrieval.topikTersedia(), null, null, st);
            }
            st.pending = false;
            st.topikInfer = null;
            List<ButirKetentuan> butir = retrieval.cari(scope);
            String teksNarasi = narasi.retrieval(scope, butir);
            return new ChatResponse(
                    "retrieval", null, null, null, null,
                    Map.of("topik", scope), null, null, null, null,
                    butir, teksNarasi, null, stateMap(st),
                    "Daftar ketentuan, bukan nasihat hukum.");
        }

        return klarifikasi(
                "Bisa dijelaskan maksudnya? (mis. hak Anda, atau daftar ketentuan)",
                retrieval.topikTersedia(), null, null, st);
    }

    private ChatResponse klarifikasi(
            String pertanyaan, List<String> pilihan, List<String> kurang,
            Slot slot, Sesi st) {
        return new ChatResponse(
                "klarifikasi", null, pertanyaan, pilihan, kurang, null,
                null, null, null, null, null, null, slot, stateMap(st),
                "Bukan nasihat hukum.");
    }

    private Map<String, Object> stateMap(Sesi st) {
        Map<String, Object> hasil = new LinkedHashMap<>();
        hasil.put("topik_infer", st.topikInfer);
        hasil.put("topik", new ArrayList<>(st.topik));
        hasil.put("fakta", new LinkedHashMap<>(st.fakta));
        hasil.put("pending", st.pending);
        return hasil;
    }

    private static Slot slot(String topik, Map<String, Object> fakta, List<String> kurang) {
        List<SlotField> fields = FormFields.FORM.getOrDefault(topik, List.of()).stream()
                .map(spec -> new SlotField(
                        spec.nama(),
                        fakta.get(spec.nama()),
                        spec.wajib(),
                        fakta.containsKey(spec.nama()) && fakta.get(spec.nama()) != null))
                .toList();
        return new Slot(topik, fields, kurang);
    }

    private static List<String> deteksiTopik(String pesan) {
        String teks = pesan.toLowerCase();
        Set<String> hasil = new HashSet<>();
        TOPIK_SINONIM.forEach((kata, topik) -> {
            if (teks.contains(kata)) {
                hasil.add(topik);
            }
        });
        return hasil.stream().sorted().toList();
    }

    private static boolean adaIndikator(String pesan, List<String> indikator) {
        String teks = pesan.toLowerCase();
        return indikator.stream().anyMatch(teks::contains);
    }

    private static String pilihTopikInfer(List<String> detected) {
        List<String> kandidat = detected.stream().filter(INFER_TOPIK::contains).toList();
        for (String pref : PREFERENSI) {
            if (kandidat.contains(pref)) {
                return pref;
            }
        }
        return null;
    }

    private static List<String> kurang(String topik, Map<String, Object> fakta) {
        return INFER_REQUIRED.getOrDefault(topik, List.of()).stream()
                .filter(field -> !fakta.containsKey(field) || fakta.get(field) == null)
                .toList();
    }

    private static Map<String, Object> lengkapiDefault(String topik, Map<String, Object> fakta) {
        Map<String, Object> hasil = new LinkedHashMap<>(fakta);
        switch (topik) {
            case "PHK" -> hasil.putIfAbsent("bentukHubunganKerja", "PKWTT");
            case "Lembur" -> hasil.putIfAbsent("padaHariKerja", true);
            case "PKWT" -> hasil.putIfAbsent("bentukHubunganKerja", "PKWT");
            case "KIA" -> hasil.putIfAbsent("sedangCutiMelahirkan", true);
            default -> {
            }
        }
        return hasil;
    }

    private static Map<String, Object> ekstrak(String topik, String pesan) {
        String p = normalisasiAngka(pesan);
        Map<String, Object> f = new LinkedHashMap<>();
        switch (topik) {
            case "PHK" -> {
                Integer masaKerja = masaKerja(p);
                Double upah = upah(p);
                if (masaKerja != null) {
                    f.put("masaKerjaBulan", masaKerja);
                }
                if (upah != null) {
                    f.put("upahBulanan", upah);
                }
                for (Map.Entry<String, String> entry : ALASAN_SINONIM.entrySet()) {
                    if (p.contains(entry.getKey())) {
                        f.put("alasanPHK", entry.getValue());
                        break;
                    }
                }
            }
            case "Lembur" -> {
                Double jam = jam(p);
                Double upah = upah(p);
                if (jam != null) {
                    f.put("jamLembur", jam);
                }
                if (upah != null) {
                    f.put("upahBulanan", upah);
                }
                if (p.contains("hari kerja")) {
                    f.put("padaHariKerja", true);
                } else if (p.contains("libur") || p.contains("akhir pekan")
                        || p.contains("weekend")) {
                    f.put("padaHariKerja", false);
                }
            }
            case "Cuti" -> {
                Integer masaKerja = masaKerja(p);
                if (masaKerja != null) {
                    f.put("masaKerjaBulan", masaKerja);
                }
                for (Map.Entry<String, String> entry : PERISTIWA_SINONIM.entrySet()) {
                    if (p.contains(entry.getKey())) {
                        f.put("peristiwa", entry.getValue());
                        break;
                    }
                }
                if (p.contains("perempuan") || p.contains("ibu") || p.contains("wanita")) {
                    f.put("perempuan", true);
                }
            }
            case "PKWT" -> {
                f.put("bentukHubunganKerja", "PKWT");
                Integer masaKerja = masaKerja(p);
                Double upah = upah(p);
                if (masaKerja != null) {
                    f.put("masaKerjaBulan", masaKerja);
                }
                if (upah != null) {
                    f.put("upahBulanan", upah);
                }
            }
            case "Jamsos" -> {
                Double upah = upah(p);
                if (upah != null) {
                    f.put("upahBulanan", upah);
                }
            }
            case "KIA" -> {
                Integer bulan = bulan(p);
                Double upah = upah(p);
                if (bulan != null) {
                    f.put("cutiMelahirkanBulan", bulan);
                }
                if (upah != null) {
                    f.put("upahBulanan", upah);
                }
                f.put("sedangCutiMelahirkan", true);
            }
            default -> {
            }
        }
        return f;
    }

    private static String normalisasiAngka(String pesan) {
        String hasil = pesan.toLowerCase();
        for (Map.Entry<String, Integer> entry : KATA_ANGKA.entrySet()) {
            hasil = hasil.replaceAll(
                    "\\b" + Pattern.quote(entry.getKey()) + "\\b",
                    entry.getValue().toString());
        }
        return hasil;
    }

    private static Integer masaKerja(String p) {
        Matcher tahun = Pattern.compile("(\\d+)\\s*tahun").matcher(p);
        if (tahun.find()) {
            return Integer.parseInt(tahun.group(1)) * 12;
        }
        Matcher bulan = Pattern.compile("(\\d+)\\s*bulan").matcher(p);
        if (bulan.find()) {
            return Integer.parseInt(bulan.group(1));
        }
        return null;
    }

    private static Double upah(String p) {
        Matcher juta = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(?:juta|jt)\\b").matcher(p);
        if (juta.find()) {
            return Double.parseDouble(juta.group(1).replace(",", ".")) * 1_000_000;
        }
        Matcher angka = Pattern.compile("(\\d{1,3}(?:[.,]\\d{3})+|\\d{4,})").matcher(p);
        if (angka.find()) {
            return Double.parseDouble(angka.group(1).replaceAll("[.,]", ""));
        }
        return null;
    }

    private static Double jam(String p) {
        Matcher matcher = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*jam").matcher(p);
        if (matcher.find()) {
            return Double.parseDouble(matcher.group(1).replace(",", "."));
        }
        return null;
    }

    private static Integer bulan(String p) {
        Matcher matcher = Pattern.compile("(\\d+)\\s*bulan").matcher(p);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return null;
    }

    private static final class Sesi {
        private String topikInfer;
        private final Set<String> topik = new LinkedHashSet<>();
        private final Map<String, Object> fakta = new LinkedHashMap<>();
        private boolean pending;
    }
}
