package ac.id.uns.kbr.validation;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLLiteral;
import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.semanticweb.owlapi.model.OWLOntologyManager;
import org.semanticweb.owlapi.search.EntitySearcher;
import org.semanticweb.owlapi.vocab.OWL2Datatype;
import org.springframework.stereotype.Component;

import ac.id.uns.kbr.kb.CaseSession;
import ac.id.uns.kbr.kb.OntologyValues;

@Component
public class CaseValidator {

    public void validasi(CaseSession session, String topik) {
        OWLOntologyManager manager = session.manager();
        OWLNamedIndividual pekerja = OntologyValues.individual(manager, "KasusPekerja");
        List<String> masalah = new ArrayList<>();

        switch (topik) {
            case "PHK" -> {
                data(manager, pekerja, "masaKerjaBulan", 1, 1, "integer", 0, null, masalah);
                data(manager, pekerja, "upahBulanan", 1, null, "decimal", 0, null, masalah);
                OWLNamedIndividual phk = OntologyValues.object(manager, pekerja, "mengalami");
                objek(manager, phk, "memilikiAlasanPHK", 1, 1, "AlasanPHK", masalah);
            }
            case "Lembur" -> {
                data(manager, pekerja, "upahBulanan", 1, null, "decimal", 0, null, masalah);
                OWLNamedIndividual lembur = OntologyValues.object(
                        manager, pekerja, "mengerjakanLembur");
                objek(manager, pekerja, "mengerjakanLembur", 1, 1, "Lembur", masalah);
                data(manager, lembur, "jamLembur", 1, null, "decimal", 0, null, masalah);
                data(manager, lembur, "padaHariKerja", 1, null, "boolean", null, null, masalah);
            }
            case "Cuti" -> data(manager, pekerja, "masaKerjaBulan", 1, 1, "integer", 0, null, masalah);
            case "PKWT" -> {
                data(manager, pekerja, "bentukHubunganKerja", 1, null, "string", null, null, masalah);
                data(manager, pekerja, "masaKerjaBulan", 1, 1, "integer", 1, null, masalah);
                data(manager, pekerja, "upahBulanan", 1, null, "decimal", 0, null, masalah);
            }
            case "Jamsos" -> data(manager, pekerja, "upahBulanan", 1, null, "decimal", 0, null, masalah);
            case "KIA" -> {
                data(manager, pekerja, "sedangCutiMelahirkan", 1, null, "boolean", null, null, masalah);
                data(manager, pekerja, "cutiMelahirkanBulan", 1, 1, "integer", 3, 6, masalah);
                data(manager, pekerja, "upahBulanan", 1, null, "decimal", 0, null, masalah);
            }
            default -> {
            }
        }

        if (!masalah.isEmpty()) {
            throw new IllegalArgumentException("Validasi SHACL gagal:\n- "
                    + String.join("\n- ", masalah));
        }
    }

    private static void data(
            OWLOntologyManager manager,
            OWLNamedIndividual ind,
            String property,
            int minCount,
            Integer maxCount,
            String datatype,
            Integer min,
            Integer max,
            List<String> masalah) {
        List<OWLLiteral> values = OntologyValues.dataValues(manager, ind, property).toList();
        if (values.size() < minCount) {
            masalah.add(property + " wajib ada");
            return;
        }
        if (maxCount != null && values.size() > maxCount) {
            masalah.add(property + " maksimal " + maxCount);
        }
        for (OWLLiteral literal : values) {
            if (!datatypeCocok(literal, datatype)) {
                masalah.add(property + " harus bertipe " + datatype);
                continue;
            }
            if (min != null || max != null) {
                try {
                    BigDecimal nilai = new BigDecimal(literal.getLiteral());
                    if (min != null && nilai.compareTo(BigDecimal.valueOf(min)) < 0) {
                        masalah.add(property + " minimal " + min);
                    }
                    if (max != null && nilai.compareTo(BigDecimal.valueOf(max)) > 0) {
                        masalah.add(property + " maksimal " + max);
                    }
                } catch (NumberFormatException exc) {
                    masalah.add(property + " bukan angka");
                }
            }
        }
    }

    private static void objek(
            OWLOntologyManager manager,
            OWLNamedIndividual ind,
            String property,
            int minCount,
            Integer maxCount,
            String kelas,
            List<String> masalah) {
        List<OWLNamedIndividual> values = OntologyValues.objectValues(manager, ind, property).toList();
        if (values.size() < minCount) {
            masalah.add(property + " wajib ada");
            return;
        }
        if (maxCount != null && values.size() > maxCount) {
            masalah.add(property + " maksimal " + maxCount);
        }
        OWLClass target = manager.getOWLDataFactory()
                .getOWLClass(IRI.create(OntologyValues.KTN + kelas));
        boolean cocok = values.stream().anyMatch(value -> manager.getOntologies().stream()
                .anyMatch(onto -> EntitySearcher.getTypes(value, onto)
                        .anyMatch(tipe -> tipe instanceof OWLClass k && k.equals(target))));
        if (!cocok) {
            masalah.add(property + " harus mengarah ke " + kelas);
        }
    }

    private static boolean datatypeCocok(OWLLiteral literal, String datatype) {
        String iri = literal.getDatatype().getIRI().toString();
        return switch (datatype) {
            case "integer" -> iri.equals(OWL2Datatype.XSD_INTEGER.getIRI().toString());
            case "decimal" -> iri.equals(OWL2Datatype.XSD_DECIMAL.getIRI().toString())
                    || iri.equals(OWL2Datatype.XSD_DOUBLE.getIRI().toString())
                    || iri.equals(OWL2Datatype.XSD_FLOAT.getIRI().toString())
                    || iri.equals(OWL2Datatype.XSD_INTEGER.getIRI().toString());
            case "boolean" -> iri.equals(OWL2Datatype.XSD_BOOLEAN.getIRI().toString());
            case "string" -> iri.equals(OWL2Datatype.XSD_STRING.getIRI().toString())
                    || iri.endsWith("#PlainLiteral");
            default -> true;
        };
    }
}
