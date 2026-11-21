package ac.id.uns.kbr.kb;

import java.util.List;
import java.util.Set;

public final class CutiEvents {

    public static final List<String> DIIZINKAN = List.of(
            "CutiHaid",
            "CutiKeguguran",
            "UpahCutiMenikah",
            "UpahCutiKeluarga2Hari",
            "UpahCutiKematianSerumah");

    public static final Set<String> PEREMPUAN = Set.of(
            "CutiHaid",
            "CutiKeguguran");

    private CutiEvents() {
    }
}
