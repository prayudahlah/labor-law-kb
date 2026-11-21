package ac.id.uns.kbr;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItem;
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

@SpringBootTest
@AutoConfigureMockMvc
class InferControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void phk() throws Exception {
        kirim("""
                {"topik":"PHK","fakta":{
                  "masaKerjaBulan":120,
                  "upahBulanan":5000000,
                  "bentukHubunganKerja":"PKWTT",
                  "alasanPHK":"EfisiensiRugi"
                }}
                """, 42_500_000.0, "Pesangon");
    }

    @Test
    void phkMasaKerjaKurang36() throws Exception {
        kirim("""
                {"topik":"PHK","fakta":{
                  "masaKerjaBulan":6,
                  "upahBulanan":12000000,
                  "bentukHubunganKerja":"PKWTT",
                  "alasanPHK":"EfisiensiRugi"
                }}
                """, 6_000_000.0, "Pesangon");
    }

    @Test
    void phkBatas36() throws Exception {
        kirim("""
                {"topik":"PHK","fakta":{
                  "masaKerjaBulan":36,
                  "upahBulanan":5000000,
                  "bentukHubunganKerja":"PKWTT",
                  "alasanPHK":"EfisiensiRugi"
                }}
                """, 20_000_000.0, "Pesangon");
    }

    @Test
    void lembur() throws Exception {
        kirim("""
                {"topik":"Lembur","fakta":{
                  "jamLembur":4,
                  "padaHariKerja":true,
                  "upahBulanan":5000000
                }}
                """, 216_763.0, "UpahLembur");
    }

    @Test
    void lemburHariLiburDuaBelasJam() throws Exception {
        kirim("""
                {"topik":"Lembur","fakta":{
                  "jamLembur":12,
                  "padaHariKerja":false,
                  "upahBulanan":5000000
                }}
                """, 895_954.0, "UpahLembur");
    }

    @Test
    void lemburLiburEnamHari() throws Exception {
        kirim("""
                {"topik":"Lembur","fakta":{
                  "jamLembur":8,
                  "jenisHari":"libur_6hari",
                  "upahBulanan":5000000
                }}
                """, 491_329.0, "UpahLembur");
    }

    @Test
    void lemburLiburTerpendek() throws Exception {
        kirim("""
                {"topik":"Lembur","fakta":{
                  "jamLembur":6,
                  "jenisHari":"libur_terpendek",
                  "upahBulanan":5000000
                }}
                """, 375_723.0, "UpahLembur");
    }

    @Test
    void pkwt() throws Exception {
        kirim("""
                {"topik":"PKWT","fakta":{
                  "bentukHubunganKerja":"PKWT",
                  "masaKerjaBulan":24,
                  "upahBulanan":5000000
                }}
                """, 10_000_000.0, "KompensasiPKWT");
    }

    @Test
    void jamsos() throws Exception {
        kirim("""
                {"topik":"Jamsos","fakta":{
                  "upahBulanan":5000000
                }}
                """, 150_000.0, "JaminanSosial");
    }

    @Test
    void kia() throws Exception {
        kirim("""
                {"topik":"KIA","fakta":{
                  "sedangCutiMelahirkan":true,
                  "cutiMelahirkanBulan":6,
                  "upahBulanan":5000000
                }}
                """, 27_500_000.0, "CutiMelahirkan");
    }

    @Test
    void cuti() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{"masaKerjaBulan":12}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("inferensi"))
                .andExpect(jsonPath("$.hak", hasItem("CutiTahunan")))
                .andExpect(jsonPath("$.pasal", not(empty())));
    }

    @Test
    void cutiMenikahTidakMemakaiPasalHaid() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "peristiwa":"UpahCutiMenikah"
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pasal", hasItem("UU 13/2003 Pasal 93 ayat (4)")))
                .andExpect(jsonPath("$.pasal", not(hasItem("UU 13/2003 Pasal 81"))))
                .andExpect(jsonPath("$.rincian.hari_dibayar").value(3));
    }

    @Test
    void cutiHaidTetapMemakaiPasalHaid() throws Exception {
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
                .andExpect(jsonPath("$.hak", hasItem("CutiHaid")))
                .andExpect(jsonPath("$.pasal", hasItem("UU 13/2003 Pasal 81")));
    }

    @Test
    void cutiPerempuanTanpaPeristiwaTidakMemakaiCutiHaid() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "perempuan":true
                                }}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hak", not(hasItem("CutiHaid"))))
                .andExpect(jsonPath("$.pasal", not(hasItem("UU 13/2003 Pasal 81"))));
    }

    private void kirim(String json, double nominal, String hak) throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("inferensi"))
                .andExpect(jsonPath("$.nominal").value(nominal))
                .andExpect(jsonPath("$.hak", hasItem(hak)))
                .andExpect(jsonPath("$.pasal", not(empty())));
    }
}
