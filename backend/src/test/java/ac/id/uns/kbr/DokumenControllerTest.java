package ac.id.uns.kbr;

import static org.hamcrest.Matchers.containsString;
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

@SpringBootTest
@AutoConfigureMockMvc
class DokumenControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void peraturanPerusahaan() throws Exception {
        mockMvc.perform(post("/dokumen")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sesi": "d1",
                                  "dokumen": "peraturan_perusahaan",
                                  "topik": ["Cuti", "Upah"],
                                  "fakta": {"nama_perusahaan": "PT Contoh"}
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("dokumen"))
                .andExpect(jsonPath("$.judul").value("Peraturan Perusahaan"))
                .andExpect(jsonPath("$.wajib", not(empty())))
                .andExpect(jsonPath("$.pasal", not(empty())))
                .andExpect(jsonPath("$.template", containsString("PT Contoh")));
    }

    @Test
    void dokumenTidakDikenal() throws Exception {
        mockMvc.perform(post("/dokumen")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"dokumen": "kontrak_kerja"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").exists());
    }
}
