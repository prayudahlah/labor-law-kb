package ac.id.uns.kbr.kb;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public final class HakMapper {

    private static final Map<String, String> MAP = Map.ofEntries(
            Map.entry("MemenuhiSyaratPesangon", "Pesangon"),
            Map.entry("MemenuhiSyaratUPMK", "UPMK"),
            Map.entry("MemenuhiSyaratUPH", "UPH"),
            Map.entry("MemenuhiSyaratUangPisah", "UangPisah"),
            Map.entry("MemenuhiSyaratCutiTahunan", "CutiTahunan"),
            Map.entry("MemenuhiSyaratCutiHaid", "CutiHaid"),
            Map.entry("MemenuhiSyaratCutiKhusus", "CutiKhusus"),
            Map.entry("MemenuhiSyaratUpahLembur", "UpahLembur"),
            Map.entry("MemenuhiSyaratKompensasiPKWT", "KompensasiPKWT"),
            Map.entry("MemenuhiSyaratJaminanSosial", "JaminanSosial"),
            Map.entry("MemenuhiSyaratCutiMelahirkan", "CutiMelahirkan"),
            Map.entry("MemenuhiSyaratCutiKeguguran", "CutiKeguguran"),
            Map.entry("MemenuhiSyaratMenyusui", "Menyusui"),
            Map.entry("MemenuhiSyaratCutiPendampinganSuami", "CutiPendampinganSuami"));

    private static final List<String> ORDER = List.of(
            "Pesangon", "UPMK", "UPH", "UangPisah",
            "CutiTahunan", "CutiHaid", "CutiKhusus",
            "UpahLembur", "KompensasiPKWT", "JaminanSosial",
            "CutiMelahirkan", "CutiKeguguran", "Menyusui", "CutiPendampinganSuami");

    private HakMapper() {
    }

    public static List<String> map(Set<String> tipe) {
        Set<String> hasil = tipe.stream()
                .map(MAP::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        return ORDER.stream().filter(hasil::contains).toList();
    }
}
