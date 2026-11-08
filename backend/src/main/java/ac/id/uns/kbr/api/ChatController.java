package ac.id.uns.kbr.api;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import ac.id.uns.kbr.api.dto.ChatRequest;
import ac.id.uns.kbr.api.dto.ChatResponse;
import ac.id.uns.kbr.kb.ChatService;

@RestController
public class ChatController {

    private final ChatService chat;

    public ChatController(ChatService chat) {
        this.chat = chat;
    }

    @PostMapping("/chat")
    public ChatResponse kirim(@RequestBody ChatRequest request) {
        return chat.jawab(request.sesi(), request.pesan());
    }
}
