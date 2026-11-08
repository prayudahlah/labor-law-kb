package ac.id.uns.kbr.kb;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import ac.id.uns.kbr.api.dto.ButirKetentuan;

@Service
public class NarasiService {

    public String inferensi(List<String> hak, CalculationResult hasil, List<String> pasal) {
        String inti = "Berdasarkan data Anda, hak yang terpenuhi: "
                + (hak.isEmpty() ? "tidak ada" : String.join(", ", hak)) + ".";
        if (hasil.nominal() != null) {
            inti += " Perkiraan nominal " + rupiah(hasil.nominal()) + ".";
        } else if (hasil.rincian() != null && !hasil.rincian().isEmpty()) {
            inti += " Rincian: " + hasil.rincian().entrySet().stream()
                    .map(entry -> entry.getKey() + "=" + entry.getValue())
                    .collect(Collectors.joining(", ")) + ".";
        }
        if (!pasal.isEmpty()) {
            inti += " Dasar: " + String.join("; ", pasal) + ".";
        }
        return inti + " Bukan nasihat hukum.";
    }

    public String retrieval(List<String> topik, List<ButirKetentuan> butir) {
        if (butir.isEmpty()) {
            return "Tidak ada ketentuan ditemukan untuk topik "
                    + String.join(", ", topik) + ".";
        }
        String contoh = butir.stream().limit(4)
                .map(ButirKetentuan::pasal)
                .collect(Collectors.joining("; "));
        return "Terdapat " + butir.size() + " ketentuan untuk topik "
                + String.join(", ", topik) + ". Contoh dasar: " + contoh
                + ". Daftar ketentuan, bukan nasihat hukum.";
    }

    private static String rupiah(double nilai) {
        return "Rp" + String.format("%,.0f", nilai).replace(',', '.');
    }
}
