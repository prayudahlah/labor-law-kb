package ac.id.uns.kbr;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class InferValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void phkTanpaUpah() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"PHK","fakta":{"masaKerjaBulan":120,"alasanPHK":"EfisiensiRugi"}}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("missing"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("upahBulanan"))
                .andExpect(jsonPath("$.detail[0].msg").value("Field required"));
    }

    @Test
    void upahNegatif() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"PHK","fakta":{"masaKerjaBulan":120,"upahBulanan":-1,"alasanPHK":"EfisiensiRugi"}}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("greater_than"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("upahBulanan"));
    }

    @Test
    void lemburHariKerjaLebih4Jam() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":5,
                                  "padaHariKerja":true,
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("less_than_equal"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("jamLembur"));
    }

    @Test
    void lemburLiburLebih12Jam() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":13,
                                  "padaHariKerja":false,
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("less_than_equal"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("jamLembur"));
    }

    @Test
    void liburEnamHariDuaBelasJamDitolak() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":12,
                                  "jenisHari":"libur_6hari",
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("less_than_equal"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("jamLembur"))
                .andExpect(jsonPath("$.detail[0].ctx.le").value(11.0));
    }

    @Test
    void liburTerpendekSepuluhJamDitolak() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":10,
                                  "jenisHari":"libur_terpendek",
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("less_than_equal"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("jamLembur"))
                .andExpect(jsonPath("$.detail[0].ctx.le").value(9.0));
    }

    @Test
    void jenisHariTidakDikenal() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":4,
                                  "jenisHari":"libur_9hari",
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("literal_error"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("jenisHari"));
    }

    @Test
    void peristiwaCutiTidakDikenal() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "peristiwa":"TidakAda"
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("literal_error"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("peristiwa"));
    }

    @Test
    void cutiHaidDenganPerempuanFalseDitolak() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "perempuan":false,
                                  "peristiwa":"CutiHaid"
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("value_error"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("perempuan"));
    }

    @Test
    void cutiKeguguranDenganPerempuanFalseDitolak() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "perempuan":false,
                                  "peristiwa":"CutiKeguguran"
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("value_error"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("perempuan"));
    }

    @Test
    void kiaBulanDiLuarRentang() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"KIA","fakta":{"cutiMelahirkanBulan":2,"upahBulanan":5000000}}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("greater_than_equal"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("cutiMelahirkanBulan"));
    }

    @Test
    void pkwtLiteralSalah() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"PKWT","fakta":{"bentukHubunganKerja":"X","masaKerjaBulan":24,"upahBulanan":5000000}}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("literal_error"))
                .andExpect(jsonPath("$.detail[0].loc[3]").value("bentukHubunganKerja"));
    }

    @Test
    void topikAsing() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"X","fakta":{}}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail[0].type").value("literal_error"));
    }
}
