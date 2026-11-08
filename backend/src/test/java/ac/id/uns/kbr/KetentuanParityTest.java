package ac.id.uns.kbr;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class KetentuanParityTest {

    private static final List<String> TOPIK = List.of(
            "AlihDaya", "Cuti", "Jamsos", "KIA", "Lembur",
            "PHK", "PKWT", "TKA", "Upah", "WaktuKerja");

    @Autowired
    private MockMvc mockMvc;

    @Test
    void semuaTopikPunyaButirDanPasal() throws Exception {
        for (String topik : TOPIK) {
            mockMvc.perform(post("/ketentuan")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"topik\":[\"" + topik + "\"]}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.mode").value("retrieval"))
                    .andExpect(jsonPath("$.butir", not(empty())))
                    .andExpect(jsonPath("$.butir[0].pasal", not(emptyString())));
        }
    }
}
