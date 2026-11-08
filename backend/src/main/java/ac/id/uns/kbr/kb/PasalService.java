package ac.id.uns.kbr.kb;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.semanticweb.owlapi.model.IRI;
import org.semanticweb.owlapi.model.OWLAnnotationProperty;
import org.semanticweb.owlapi.model.OWLClass;
import org.semanticweb.owlapi.model.OWLEntity;
import org.semanticweb.owlapi.model.OWLLiteral;
import org.semanticweb.owlapi.search.EntitySearcher;
import org.springframework.stereotype.Service;

@Service
public class PasalService {

    private final OntologyService ontology;

    public PasalService(OntologyService ontology) {
        this.ontology = ontology;
    }

    public List<String> pasal(String topik, CaseSession session, Map<String, Object> fakta) {
        List<OWLEntity> entities = new ArrayList<>();
        switch (topik) {
            case "PHK" -> entities.add(individu(session, teks(fakta, "alasanPHK")));
            case "Lembur" -> {
                entities.add(individu(session, "UpahSejamLembur"));
                entities.add(individu(session, "BatasJamLembur"));
            }
            case "PKWT" -> entities.add(individu(session, "BesaranUangKompensasiPKWT"));
            case "Jamsos" -> {
                entities.add(individu(session, "JHT"));
                entities.add(individu(session, "JP"));
            }
            case "KIA" -> entities.add(individu(session, "KetentuanUpahCutiMelahirkan"));
            case "Cuti" -> {
                entities.add(kelas(session, "MemenuhiSyaratCutiTahunan"));
                entities.add(kelas(session, "MemenuhiSyaratCutiKhusus"));
                entities.add(kelas(session, "MemenuhiSyaratCutiHaid"));
            }
            default -> {
            }
        }

        OWLAnnotationProperty pasal = session.df()
                .getOWLAnnotationProperty(IRI.create(OntologyValues.KTN + "pasal"));
        return entities.stream()
                .flatMap(entity -> EntitySearcher.getAnnotations(entity, ontology.modul(), pasal))
                .map(annotation -> annotation.getValue().asLiteral()
                        .map(OWLLiteral::getLiteral).orElse(""))
                .filter(teks -> !teks.isBlank())
                .distinct()
                .toList();
    }

    private static OWLEntity individu(CaseSession session, String nama) {
        return session.df().getOWLNamedIndividual(IRI.create(OntologyValues.KTN + nama));
    }

    private static OWLEntity kelas(CaseSession session, String nama) {
        return session.df().getOWLClass(IRI.create(OntologyValues.KTN + nama));
    }

    private static String teks(Map<String, Object> fakta, String key) {
        Object value = fakta.get(key);
        return value == null ? "" : value.toString();
    }
}
