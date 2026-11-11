package ac.id.uns.kbr;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
class KetentuanControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void cutiDanUpah() throws Exception {
        mockMvc.perform(post("/ketentuan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":["Cuti","Upah"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("retrieval"))
                .andExpect(jsonPath("$.butir", not(empty())))
                .andExpect(jsonPath("$.butir[0].pasal", not(emptyString())))
                .andExpect(jsonPath("$.scope.topik", hasItem("Cuti")));
    }

    @Test
    void topikTidakDikenal() throws Exception {
        mockMvc.perform(post("/ketentuan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"topik":["TidakAda"]}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void dokumenPreset() throws Exception {
        mockMvc.perform(get("/ketentuan/dokumen"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(10)))
                .andExpect(jsonPath("$[*].id", hasItem("DokumenPKWT")));
    }

    @Test
    void ketentuanDokumen() throws Exception {
        mockMvc.perform(post("/ketentuan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dokumen":"DokumenPKWT"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("retrieval"))
                .andExpect(jsonPath("$.scope.dokumen").value("DokumenPKWT"))
                .andExpect(jsonPath("$.butir", not(empty())))
                .andExpect(jsonPath("$.butir[0].tautan", not(emptyString())));
    }

    @Test
    void dokumenTidakDikenal() throws Exception {
        mockMvc.perform(post("/ketentuan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dokumen":"TidakAda"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").exists());
    }
}
