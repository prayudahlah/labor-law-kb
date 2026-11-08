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

@SpringBootTest
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
