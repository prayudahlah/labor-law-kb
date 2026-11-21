package ac.id.uns.kbr;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.semanticweb.owlapi.model.AddImport;
import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLDataFactory;
import org.semanticweb.owlapi.model.OWLOntology;
import org.semanticweb.owlapi.model.OWLOntologyManager;

import ac.id.uns.kbr.kb.CaseSession;
import ac.id.uns.kbr.kb.Forms;
import ac.id.uns.kbr.kb.OntologyLoader;
import ac.id.uns.kbr.kb.OntologyValues;
import ac.id.uns.kbr.validation.CaseValidator;

class CaseValidatorTest {

    private static final String KTN = OntologyValues.KTN;
    private static OWLOntology kb;
    private static OWLOntologyManager manager;

    @BeforeAll
    static void muatKb() throws Exception {
        kb = OntologyLoader.load(Path.of("..", "ontology").toAbsolutePath().normalize());
        manager = kb.getOWLOntologyManager();
    }

    private static CaseSession sesi(Map<String, Object> fakta) throws Exception {
        return sesi("Lembur", fakta);
    }

    private static CaseSession sesi(String topik, Map<String, Object> fakta) throws Exception {
        OWLDataFactory df = manager.getOWLDataFactory();
        OWLOntology kasus = manager.createOntology(
                IRI.create(KTN + "KasusUji" + UUID.randomUUID()));
        manager.applyChange(new AddImport(kasus,
                df.getOWLImportsDeclaration(kb.getOntologyID().getOntologyIRI().orElseThrow())));
        CaseSession sesi = new CaseSession(manager, df, kasus);
        new Forms().isi(sesi, topik, fakta);
        return sesi;
    }

    @Test
    void hariKerjaLimaJamDitolak() throws Exception {
        try (CaseSession sesi = sesi(Map.of(
                "jamLembur", 5,
                "padaHariKerja", true,
                "upahBulanan", 5_000_000))) {
            assertThrows(IllegalArgumentException.class,
                    () -> new CaseValidator().validasi(sesi, "Lembur"));
        }
    }

    @Test
    void liburTigaBelasJamDitolak() throws Exception {
        try (CaseSession sesi = sesi(Map.of(
                "jamLembur", 13,
                "padaHariKerja", false,
                "upahBulanan", 5_000_000))) {
            assertThrows(IllegalArgumentException.class,
                    () -> new CaseValidator().validasi(sesi, "Lembur"));
        }
    }

    @Test
    void liburDuaBelasJamDiterima() throws Exception {
        try (CaseSession sesi = sesi(Map.of(
                "jamLembur", 12,
                "padaHariKerja", false,
                "upahBulanan", 5_000_000))) {
            assertDoesNotThrow(() -> new CaseValidator().validasi(sesi, "Lembur"));
        }
    }

    @Test
    void hariKerjaEmpatJamDiterima() throws Exception {
        try (CaseSession sesi = sesi(Map.of(
                "jamLembur", 4,
                "padaHariKerja", true,
                "upahBulanan", 5_000_000))) {
            assertDoesNotThrow(() -> new CaseValidator().validasi(sesi, "Lembur"));
        }
    }

    @Test
    void liburEnamHariSebelasJamDiterima() throws Exception {
        try (CaseSession sesi = sesi(Map.of(
                "jamLembur", 11,
                "jenisHari", "libur_6hari",
                "upahBulanan", 5_000_000))) {
            assertDoesNotThrow(() -> new CaseValidator().validasi(sesi, "Lembur"));
        }
    }

    @Test
    void liburEnamHariDuaBelasJamDitolak() throws Exception {
        try (CaseSession sesi = sesi(Map.of(
                "jamLembur", 12,
                "jenisHari", "libur_6hari",
                "upahBulanan", 5_000_000))) {
            assertThrows(IllegalArgumentException.class,
                    () -> new CaseValidator().validasi(sesi, "Lembur"));
        }
    }

    @Test
    void liburTerpendekSembilanJamDiterima() throws Exception {
        try (CaseSession sesi = sesi(Map.of(
                "jamLembur", 9,
                "jenisHari", "libur_terpendek",
                "upahBulanan", 5_000_000))) {
            assertDoesNotThrow(() -> new CaseValidator().validasi(sesi, "Lembur"));
        }
    }

    @Test
    void liburTerpendekSepuluhJamDitolak() throws Exception {
        try (CaseSession sesi = sesi(Map.of(
                "jamLembur", 10,
                "jenisHari", "libur_terpendek",
                "upahBulanan", 5_000_000))) {
            assertThrows(IllegalArgumentException.class,
                    () -> new CaseValidator().validasi(sesi, "Lembur"));
        }
    }

    @Test
    void peristiwaCutiTidakDikenalDitolak() throws Exception {
        try (CaseSession sesi = sesi("Cuti", Map.of(
                "masaKerjaBulan", 12,
                "peristiwa", "TidakAda"))) {
            assertThrows(IllegalArgumentException.class,
                    () -> new CaseValidator().validasi(sesi, "Cuti"));
        }
    }
}
