package ac.id.uns.kbr;

import static org.hamcrest.Matchers.hasItem;
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
class AutoFallbackTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void lemburPecahanMemakaiFallbackJava() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":3.5,
                                  "padaHariKerja":true,
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("inferensi"))
                .andExpect(jsonPath("$.nominal").value(187_861.0));
    }

    @Test
    void lemburLiburEnamHari() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":8,
                                  "jenisHari":"libur_6hari",
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nominal").value(491_329.0));
    }

    @Test
    void lemburLiburTerpendek() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":6,
                                  "jenisHari":"libur_terpendek",
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nominal").value(375_723.0));
    }

    @Test
    void lemburLiburEnamHariSebelasJam() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":11,
                                  "jenisHari":"libur_6hari",
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nominal").value(838_150.0));
    }

    @Test
    void lemburLiburEnamHariDuaBelasJamDitolak() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":12,
                                  "jenisHari":"libur_6hari",
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void lemburLiburTerpendekSembilanJam() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":9,
                                  "jenisHari":"libur_terpendek",
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nominal").value(722_543.0));
    }

    @Test
    void lemburLiburTerpendekSepuluhJamDitolak() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":10,
                                  "jenisHari":"libur_terpendek",
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void cutiMenikahMemakaiFallbackJava() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "peristiwa":"UpahCutiMenikah"
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rincian.cuti_tahunan_hari").value(12))
                .andExpect(jsonPath("$.rincian.hari_dibayar").value(3))
                .andExpect(jsonPath("$.rincian.peristiwa").value("UpahCutiMenikah"));
    }

    @Test
    void cutiKematianSerumahMemakaiFallbackJava() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "peristiwa":"UpahCutiKematianSerumah"
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rincian.hari_dibayar").value(1));
    }

    @Test
    void cutiHaidMemakaiFallbackJava() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "perempuan":true,
                                  "peristiwa":"CutiHaid"
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rincian.cuti_haid_hari").value(2));
    }

    @Test
    void cutiHaidTanpaFieldPerempuanTetapJalan() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "peristiwa":"CutiHaid"
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hak", hasItem("CutiHaid")))
                .andExpect(jsonPath("$.rincian.cuti_haid_hari").value(2));
    }

    @Test
    void cutiKeguguranTanpaFieldPerempuanTetapJalan() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "peristiwa":"CutiKeguguran"
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rincian.cuti_keguguran_bulan").value(1.5))
                .andExpect(jsonPath("$.rincian.cuti_haid_hari").doesNotExist());
    }

    @Test
    void cutiKeguguranMemakaiDurasiBulan() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "perempuan":true,
                                  "peristiwa":"CutiKeguguran"
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rincian.cuti_keguguran_bulan").value(1.5))
                .andExpect(jsonPath("$.rincian.cuti_haid_hari").doesNotExist());
    }
}
