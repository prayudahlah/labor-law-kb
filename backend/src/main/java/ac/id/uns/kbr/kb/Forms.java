package ac.id.uns.kbr.kb;

import java.math.BigDecimal;
import java.util.Map;

import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.vocab.OWL2Datatype;
import org.springframework.stereotype.Component;

@Component
public class Forms {

    public void isi(CaseSession s, String topik, Map<String, Object> fakta) {        switch (topik) {
            case "PHK" -> phk(s, fakta);
            case "Lembur" -> lembur(s, fakta);
            case "Cuti" -> cuti(s, fakta);
            case "PKWT" -> pkwt(s, fakta);
            case "Jamsos" -> jamsos(s, fakta);
            case "KIA" -> kia(s, fakta);
            default -> throw new IllegalArgumentException("Topik tidak didukung: " + topik);
        }
    }

    private void phk(CaseSession s, Map<String, Object> f) {
        OWLNamedIndividual p = individu(s, "KasusPekerja");
        kelas(s, p, "Pekerja");
        dataInt(s, p, "masaKerjaBulan", wajibInt(f, "masaKerjaBulan"));
        dataDecimal(s, p, "upahBulanan", wajibDecimal(f, "upahBulanan"));
        dataString(s, p, "bentukHubunganKerja", teks(f, "bentukHubunganKerja", "PKWTT"));

        OWLNamedIndividual phk = individu(s, "KasusPHK");
        kelas(s, phk, "PHK");
        objek(s, p, "mengalami", phk);
        objek(s, phk, "memilikiAlasanPHK", individu(s, wajibTeks(f, "alasanPHK")));
    }

    private void lembur(CaseSession s, Map<String, Object> f) {
        OWLNamedIndividual p = individu(s, "KasusPekerja");
        kelas(s, p, "Pekerja");
        dataDecimal(s, p, "upahBulanan", wajibDecimal(f, "upahBulanan"));

        OWLNamedIndividual l = individu(s, "KasusLembur");
        kelas(s, l, "Lembur");
        objek(s, p, "mengerjakanLembur", l);
        dataDecimal(s, l, "jamLembur", wajibDecimal(f, "jamLembur"));
        dataBool(s, l, "padaHariKerja", bool(f, "padaHariKerja", true));
    }

    private void cuti(CaseSession s, Map<String, Object> f) {
        OWLNamedIndividual p = individu(s, "KasusPekerja");
        kelas(s, p, bool(f, "perempuan", false) ? "PekerjaPerempuan" : "Pekerja");
        dataInt(s, p, "masaKerjaBulan", wajibInt(f, "masaKerjaBulan"));
        String peristiwa = teks(f, "peristiwa", null);
        if (peristiwa != null) {
            OWLNamedIndividual per = individu(s, peristiwa);
            kelas(s, per, "PeristiwaCutiKhusus");
            objek(s, p, "mengalamiPeristiwa", per);
        }
    }

    private void pkwt(CaseSession s, Map<String, Object> f) {
        OWLNamedIndividual p = individu(s, "KasusPekerja");
        kelas(s, p, "Pekerja");
        dataString(s, p, "bentukHubunganKerja", teks(f, "bentukHubunganKerja", "PKWT"));
        dataInt(s, p, "masaKerjaBulan", wajibInt(f, "masaKerjaBulan"));
        dataDecimal(s, p, "upahBulanan", wajibDecimal(f, "upahBulanan"));
    }

    private void jamsos(CaseSession s, Map<String, Object> f) {
        OWLNamedIndividual p = individu(s, "KasusPekerja");
        kelas(s, p, "Pekerja");
        dataDecimal(s, p, "upahBulanan", wajibDecimal(f, "upahBulanan"));
    }

    private void kia(CaseSession s, Map<String, Object> f) {
        OWLNamedIndividual p = individu(s, "KasusPekerja");
        kelas(s, p, "PekerjaPerempuan");
        dataBool(s, p, "sedangCutiMelahirkan", bool(f, "sedangCutiMelahirkan", true));
        dataInt(s, p, "cutiMelahirkanBulan", wajibInt(f, "cutiMelahirkanBulan"));
        dataDecimal(s, p, "upahBulanan", wajibDecimal(f, "upahBulanan"));
    }

    public Object koersi(String field, Object value) {
        if (value == null) {
            return null;
        }
        String tipe = FormFields.tipe(field);
        try {
            return switch (tipe) {
                case "integer" -> (int) Double.parseDouble(value.toString());
                case "decimal" -> Double.parseDouble(value.toString().replace(",", "."));
                case "boolean" -> {
                    String teks = value.toString().toLowerCase();
                    yield teks.equals("true") || teks.equals("1")
                            || teks.equals("ya") || teks.equals("yes");
                }
                default -> value.toString();
            };
        } catch (NumberFormatException exc) {
            return null;
        }
    }

    private static OWLNamedIndividual individu(CaseSession s, String nama) {
        return s.df().getOWLNamedIndividual(IRI.create(OntologyValues.KTN + nama));
    }

    private static void kelas(CaseSession s, OWLNamedIndividual i, String nama) {
        s.manager().addAxiom(s.kasus(), s.df().getOWLClassAssertionAxiom(
                s.df().getOWLClass(IRI.create(OntologyValues.KTN + nama)), i));
    }

    private static void dataInt(CaseSession s, OWLNamedIndividual i, String prop, int nilai) {
        s.manager().addAxiom(s.kasus(), s.df().getOWLDataPropertyAssertionAxiom(
                s.df().getOWLDataProperty(IRI.create(OntologyValues.KTN + prop)), i, nilai));
    }

    private static void dataDecimal(CaseSession s, OWLNamedIndividual i, String prop, double nilai) {
        s.manager().addAxiom(s.kasus(), s.df().getOWLDataPropertyAssertionAxiom(
                s.df().getOWLDataProperty(IRI.create(OntologyValues.KTN + prop)), i,
                s.df().getOWLLiteral(
                        BigDecimal.valueOf(nilai).toPlainString(),
                        OWL2Datatype.XSD_DECIMAL)));
    }

    private static void dataBool(CaseSession s, OWLNamedIndividual i, String prop, boolean nilai) {
        s.manager().addAxiom(s.kasus(), s.df().getOWLDataPropertyAssertionAxiom(
                s.df().getOWLDataProperty(IRI.create(OntologyValues.KTN + prop)), i,
                s.df().getOWLLiteral(nilai)));
    }

    private static void dataString(CaseSession s, OWLNamedIndividual i, String prop, String nilai) {
        s.manager().addAxiom(s.kasus(), s.df().getOWLDataPropertyAssertionAxiom(
                s.df().getOWLDataProperty(IRI.create(OntologyValues.KTN + prop)), i,
                s.df().getOWLLiteral(nilai)));
    }

    private static void objek(
            CaseSession s, OWLNamedIndividual subjek, String prop, OWLNamedIndividual objek) {
        s.manager().addAxiom(s.kasus(), s.df().getOWLObjectPropertyAssertionAxiom(
                s.df().getOWLObjectProperty(IRI.create(OntologyValues.KTN + prop)), subjek, objek));
    }

    private static int wajibInt(Map<String, Object> f, String key) {
        Object v = f.get(key);
        if (v == null) {
            throw new IllegalArgumentException("Field wajib: " + key);
        }
        return ((Number) v).intValue();
    }

    private static double wajibDecimal(Map<String, Object> f, String key) {
        Object v = f.get(key);
        if (v == null) {
            throw new IllegalArgumentException("Field wajib: " + key);
        }
        return ((Number) v).doubleValue();
    }

    private static String wajibTeks(Map<String, Object> f, String key) {
        Object v = f.get(key);
        if (v == null || v.toString().isBlank()) {
            throw new IllegalArgumentException("Field wajib: " + key);
        }
        return v.toString();
    }

    private static String teks(Map<String, Object> f, String key, String def) {
        Object v = f.get(key);
        return v == null ? def : v.toString();
    }

    private static boolean bool(Map<String, Object> f, String key, boolean def) {
        Object v = f.get(key);
        return v == null ? def : Boolean.parseBoolean(v.toString());
    }
}
