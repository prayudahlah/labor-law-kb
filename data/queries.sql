-- Query audit atas CSV kanonik di data/.
-- Jalankan: duckdb < data/queries.sql
-- Interaktif: duckdb, lalu  .read data/queries.sql
--
-- Catatan: path relatif terhadap direktori root proyek.
-- Arti confidence dan dasar_keyakinan: lihat data/skema_confidence.md.
-- confidence/dasar_keyakinan hanya metadata audit; tidak masuk Turtle.

CREATE OR REPLACE VIEW regulasi AS SELECT * FROM read_csv_auto('data/regulasi.csv');
CREATE OR REPLACE VIEW norma AS SELECT * FROM read_csv_auto('data/norma.csv');
CREATE OR REPLACE VIEW parameter AS SELECT * FROM read_csv_auto('data/parameter.csv');
CREATE OR REPLACE VIEW kategori AS SELECT * FROM read_csv_auto('data/kategori.csv');
CREATE OR REPLACE VIEW pengali_lembur AS SELECT * FROM read_csv_auto('data/pengali_lembur.csv');
CREATE OR REPLACE VIEW program_jamsos AS SELECT * FROM read_csv_auto('data/program_jamsos.csv');
CREATE OR REPLACE VIEW verifikasi AS SELECT * FROM read_csv_auto('data/verifikasi.csv');

-- Norma yang perlu diverifikasi manusia: confidence rendah atau nilainya dinamis/tidak lengkap
CREATE OR REPLACE VIEW perlu_cek AS
SELECT n.norm_id, n.pasal, n.confidence, n.dasar_keyakinan, n.bukti,
       COALESCE(v.status, 'belum') AS status
FROM norma n
LEFT JOIN verifikasi v USING (norm_id)
WHERE (n.confidence < 0.7 OR n.dasar_keyakinan IN ('dinamis', 'tidak_lengkap'))
  AND COALESCE(v.status, 'belum') <> 'diverifikasi'
ORDER BY n.confidence, n.norm_id;

-- Elemen yang nilainya berubah menurut waktu atau wilayah
CREATE OR REPLACE VIEW dinamis AS
SELECT norm_id, pasal, confidence, dasar_keyakinan, catatan
FROM norma
WHERE dasar_keyakinan IN ('dinamis', 'tidak_lengkap')
ORDER BY norm_id;

-- Sebaran confidence per tabel
CREATE OR REPLACE VIEW sebaran_confidence AS
SELECT 'norma' AS tabel, confidence, COUNT(*) AS jumlah FROM norma GROUP BY confidence
UNION ALL SELECT 'parameter', confidence, COUNT(*) FROM parameter GROUP BY confidence
UNION ALL SELECT 'kategori', confidence, COUNT(*) FROM kategori GROUP BY confidence
UNION ALL SELECT 'pengali_lembur', confidence, COUNT(*) FROM pengali_lembur GROUP BY confidence
UNION ALL SELECT 'program_jamsos', confidence, COUNT(*) FROM program_jamsos GROUP BY confidence
ORDER BY tabel, confidence;

-- Ringkasan pengali per alasan PHK
CREATE OR REPLACE VIEW rekap_alasan AS
SELECT n.norm_id, n.pasal, n.confidence,
       MAX(CASE WHEN p.nama = 'pengaliUP' THEN p.nilai END) AS pengali_up,
       MAX(CASE WHEN p.nama = 'pengaliUPMK' THEN p.nilai END) AS pengali_upmk
FROM norma n
LEFT JOIN parameter p USING (norm_id)
GROUP BY n.norm_id, n.pasal, n.confidence
ORDER BY n.norm_id;

-- Tabel pesangon dan UPMK (rentang masa kerja dalam bulan)
CREATE OR REPLACE VIEW rekap_kategori AS
SELECT nama_tabel, min_bulan, max_bulan, nilai_bulan, pasal
FROM kategori
ORDER BY nama_tabel, min_bulan;

-- Tarif iuran jaminan sosial
CREATE OR REPLACE VIEW rekap_iuran AS
SELECT program_id, jenis_program, tingkat_risiko, tarif_pengusaha_persen,
       tarif_pekerja_persen, tarif_total_persen, pasal, catatan
FROM program_jamsos
ORDER BY jenis_program, tingkat_risiko;

SELECT '=== perlu cek ===' AS bagian;
SELECT * FROM perlu_cek;
SELECT '=== dinamis ===' AS bagian;
SELECT * FROM dinamis;
SELECT '=== sebaran confidence ===' AS bagian;
SELECT * FROM sebaran_confidence;
SELECT '=== rekap iuran ===' AS bagian;
SELECT * FROM rekap_iuran;
