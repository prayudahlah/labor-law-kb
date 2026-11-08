package ac.id.uns.kbr;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItems;
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

@SpringBootTest(properties = {
        "llm.base-url=",
        "llm.api-key="
})
@AutoConfigureMockMvc
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void phkMultiTurn() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"chat-phk","pesan":"saya di-phk, gaji 5 juta"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("klarifikasi"))
                .andExpect(jsonPath("$.kurang", hasItems("masaKerjaBulan", "alasanPHK")))
                .andExpect(jsonPath("$.slot.topik").value("PHK"));

        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"chat-phk","pesan":"sudah 10 tahun, efisiensi"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("inferensi"))
                .andExpect(jsonPath("$.nominal").value(42500000.0))
                .andExpect(jsonPath("$.rincian.total_bulan").value(8.5))
                .andExpect(jsonPath("$.pasal", not(empty())));
    }

    @Test
    void retrieval() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"chat-ret","pesan":"cuti dan upah"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("retrieval"))
                .andExpect(jsonPath("$.butir", not(empty())));
    }

    @Test
    void klarifikasi() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"chat-klar","pesan":"halo"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("klarifikasi"))
                .andExpect(jsonPath("$.pilihan", not(empty())));
    }

    @Test
    void lembur() throws Exception {
        mockMvc.perform(post("/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sesi":"chat-lembur","pesan":"lembur 4 jam hari kerja, gaji 5 juta"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("inferensi"))
                .andExpect(jsonPath("$.nominal").value(216763.0));
    }
}
