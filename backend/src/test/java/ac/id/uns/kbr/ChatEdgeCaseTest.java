package ac.id.uns.kbr;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "kb.calculation.mode=auto")
@AutoConfigureMockMvc
class ChatEdgeCaseTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void retrievalOnlyUpah() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-upah","pesan":"apa saja ketentuan upah"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("retrieval"))
                .andExpect(jsonPath("$.butir", not(empty())));
    }

    @Test
    void pesanKosong() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-kosong","pesan":""}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("klarifikasi"))
                .andExpect(jsonPath("$.pilihan", not(empty())));
    }

    @Test
    void cutiHaidMengisiPeristiwa() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-haid","pesan":"saya mau cuti haid, hak saya apa"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slot.fields[1].nama").value("peristiwa"))
                .andExpect(jsonPath("$.slot.fields[1].nilai").value("CutiHaid"));
    }

    @Test
    void cutiMenikahMengisiPeristiwa() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-menikah","pesan":"saya mau cuti menikah, hak saya apa"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slot.fields[1].nilai").value("UpahCutiMenikah"));
    }

    @Test
    void cutiMenikahkanAnakMemakaiIndividuDuaHari() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-menikahkan","pesan":"saya mau cuti menikahkan anak, hak saya apa"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slot.fields[1].nilai").value("UpahCutiKeluarga2Hari"));
    }

    @Test
    void lemburLiburEnamHariMemakaiJenisHari() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-libur6","pesan":"lembur libur 6 hari 8 jam, upah 5 juta"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("inferensi"))
                .andExpect(jsonPath("$.nominal").value(491329.0))
                .andExpect(jsonPath("$.slot.fields[1].terisi").value(false))
                .andExpect(jsonPath("$.slot.fields[2].nama").value("jenisHari"))
                .andExpect(jsonPath("$.slot.fields[2].nilai").value("libur_6hari"));
    }

    @Test
    void lemburLiburTerpendekMemakaiJenisHari() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-liburpendek","pesan":"lembur libur terpendek 6 jam, upah 5 juta"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("inferensi"))
                .andExpect(jsonPath("$.nominal").value(375723.0))
                .andExpect(jsonPath("$.slot.fields[2].nilai").value("libur_terpendek"));
    }

    @Test
    void lemburHariKerjaMemakaiJenisHari() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-harikerja","pesan":"lembur 4 jam hari kerja, gaji 5 juta"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("inferensi"))
                .andExpect(jsonPath("$.nominal").value(216763.0))
                .andExpect(jsonPath("$.slot.fields[2].nilai").value("hari_kerja"));
    }

    @Test
    void cutiKeguguranMengisiPeristiwa() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-keguguran","pesan":"cuti keguguran, masa kerja 12 bulan"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("inferensi"))
                .andExpect(jsonPath("$.slot.fields[1].nilai").value("CutiKeguguran"))
                .andExpect(jsonPath("$.rincian.cuti_keguguran_bulan").value(1.5))
                .andExpect(jsonPath("$.rincian.cuti_haid_hari").doesNotExist());
    }

    @Test
    void lemburJenisHariBertahanLintasTurn() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-libur6-turn","pesan":"lembur libur 6 hari"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("klarifikasi"))
                .andExpect(jsonPath("$.slot.fields[2].nilai").value("libur_6hari"));

        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-libur6-turn","pesan":"8 jam, upah 5 juta"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("inferensi"))
                .andExpect(jsonPath("$.nominal").value(491329.0))
                .andExpect(jsonPath("$.slot.fields[2].nilai").value("libur_6hari"));
    }

    @Test
    void topikTanpaFakta() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"edge-phk","pesan":"phk"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("retrieval"))
                .andExpect(jsonPath("$.butir", not(empty())));
    }
}
