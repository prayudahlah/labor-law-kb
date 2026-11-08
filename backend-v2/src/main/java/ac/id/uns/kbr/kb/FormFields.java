package ac.id.uns.kbr.kb;

import java.util.List;
import java.util.Map;

public final class FormFields {

    public record Spec(String nama, String tipe, boolean wajib) {
    }

    public static final Map<String, List<Spec>> FORM = Map.of(
            "PHK", List.of(
                    new Spec("masaKerjaBulan", "integer", true),
                    new Spec("upahBulanan", "decimal", true),
                    new Spec("bentukHubunganKerja", "string", false),
                    new Spec("alasanPHK", "string", true)),
            "Lembur", List.of(
                    new Spec("jamLembur", "decimal", true),
                    new Spec("padaHariKerja", "boolean", true),
                    new Spec("upahBulanan", "decimal", true)),
            "Cuti", List.of(
                    new Spec("masaKerjaBulan", "integer", true),
                    new Spec("peristiwa", "string", false),
                    new Spec("perempuan", "boolean", false)),
            "PKWT", List.of(
                    new Spec("bentukHubunganKerja", "string", true),
                    new Spec("masaKerjaBulan", "integer", true),
                    new Spec("upahBulanan", "decimal", true)),
            "Jamsos", List.of(
                    new Spec("upahBulanan", "decimal", true)),
            "KIA", List.of(
                    new Spec("sedangCutiMelahirkan", "boolean", true),
                    new Spec("cutiMelahirkanBulan", "integer", true),
                    new Spec("upahBulanan", "decimal", true)));

    private FormFields() {
    }

    public static String tipe(String field) {
        return FORM.values().stream()
                .flatMap(List::stream)
                .filter(spec -> spec.nama().equals(field))
                .map(Spec::tipe)
                .findFirst()
                .orElse("string");
    }
}
