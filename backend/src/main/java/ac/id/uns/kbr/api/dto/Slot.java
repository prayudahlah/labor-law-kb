package ac.id.uns.kbr.api.dto;

import java.util.List;

public record Slot(String topik, List<SlotField> fields, List<String> kurang) {
}
