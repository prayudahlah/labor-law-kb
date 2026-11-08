package ac.id.uns.kbr.api.dto;

import java.util.List;

public record KetentuanRequest(List<String> topik, Boolean wajib) {
}
