package ac.id.uns.kbr.kb;

public final class LemburRules {

    private LemburRules() {
    }

    public static int batasJam(String jenisHari) {
        if (jenisHari == null) {
            return 4;
        }
        return switch (jenisHari) {
            case "hari_kerja" -> 4;
            case "libur_5hari" -> 12;
            case "libur_6hari" -> 11;
            case "libur_terpendek" -> 9;
            default -> throw new IllegalArgumentException(
                    "Jenis hari tidak dikenal: " + jenisHari);
        };
    }

    public static int batasJam(boolean padaHariKerja) {
        return padaHariKerja ? 4 : 12;
    }
}
