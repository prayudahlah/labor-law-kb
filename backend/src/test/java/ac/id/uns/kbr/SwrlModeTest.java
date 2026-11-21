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

@SpringBootTest(properties = "kb.calculation.mode=swrl")
@AutoConfigureMockMvc
class SwrlModeTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void cutiKhususTidakTersediaMenjadi422() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "peristiwa":"UpahCutiMenikah"
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value(
                        "Kasus ini belum didukung mode SWRL. Gunakan mode auto."));
    }

    @Test
    void lemburPecahanTidakTersediaMenjadi422() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Lembur","fakta":{
                                  "jamLembur":3.5,
                                  "padaHariKerja":true,
                                  "upahBulanan":5000000
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value(
                        "Kasus ini belum didukung mode SWRL. Gunakan mode auto."));
    }

    @Test
    void cutiKeguguranTidakTersediaMenjadi422() throws Exception {
        mockMvc.perform(post("/infer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":"Cuti","fakta":{
                                  "masaKerjaBulan":12,
                                  "perempuan":true,
                                  "peristiwa":"CutiKeguguran"
                                }}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value(
                        "Kasus ini belum didukung mode SWRL. Gunakan mode auto."));
    }
}
