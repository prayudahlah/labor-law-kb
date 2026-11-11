package ac.id.uns.kbr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import ac.id.uns.kbr.api.dto.ButirKetentuan;
import ac.id.uns.kbr.api.dto.DokumenPreset;
import ac.id.uns.kbr.kb.SparqlService;

@SpringBootTest
class SparqlServiceTest {

    @Autowired
    private SparqlService sparql;

    @Test
    void daftarDokumenSepuluh() {
        List<DokumenPreset> presets = sparql.daftarDokumen();
        assertEquals(10, presets.size());
        assertTrue(presets.stream().anyMatch(item -> item.id().equals("DokumenPKWT")));
    }

    @Test
    void cariDokumenPkwt() {
        List<ButirKetentuan> butir = sparql.cariDokumen("DokumenPKWT");
        assertFalse(butir.isEmpty());
        assertTrue(butir.stream().allMatch(item ->
                item.tautan() != null && !item.tautan().isBlank()));
        assertTrue(butir.stream().anyMatch(item ->
                item.norma().equals("BatasJangkaWaktuPKWT")));
    }

    @Test
    void cariTopikPkwt() {
        List<ButirKetentuan> butir = sparql.cariTopik(List.of("PKWT"));
        assertFalse(butir.isEmpty());
        assertTrue(butir.stream().allMatch(item ->
                item.tautan() != null && !item.tautan().isBlank()));
    }
}
