package ac.id.uns.kbr.kb;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.semanticweb.owlapi.model.OWLNamedIndividual;
import org.springframework.stereotype.Service;

import ac.id.uns.kbr.api.dto.InferRequest;
import ac.id.uns.kbr.api.dto.InferResponse;
import openllet.owlapi.OpenlletReasoner;

@Service
public class InferenceService {

    private static final Set<String> TOPIK =
            Set.of("PHK", "Lembur", "Cuti", "PKWT", "Jamsos", "KIA");

    private final ReasonerService reasoner;
    private final Forms forms;
    private final CalculationProvider calculation;
    private final PasalService pasal;
    private final NarasiService narasi;

    public InferenceService(
            ReasonerService reasoner,
            Forms forms,
            CalculationProvider calculation,
            PasalService pasal,
            NarasiService narasi) {
        this.reasoner = reasoner;
        this.forms = forms;
        this.calculation = calculation;
        this.pasal = pasal;
        this.narasi = narasi;
    }

    public InferResponse infer(InferRequest request) {
        if (request == null || request.topik() == null || !TOPIK.contains(request.topik())) {
            throw new IllegalArgumentException("topik tidak didukung: "
                    + (request == null ? null : request.topik()));
        }
        if (request.fakta() == null) {
            throw new IllegalArgumentException("fakta wajib diisi");
        }

        return reasoner.denganKasus(session -> {
            forms.isi(session, request.topik(), request.fakta());
            OpenlletReasoner owlReasoner = session.reasoner();
            OWLNamedIndividual kasus = OntologyValues.individual(session.manager(), "KasusPekerja");

            Set<String> tipe = owlReasoner.getTypes(kasus, false).getFlattened().stream()
                    .map(kelas -> kelas.getIRI().getFragment())
                    .collect(Collectors.toSet());
            List<String> hak = HakMapper.map(tipe);

            CalculationResult hasil = calculation.hitung(
                    request.topik(), kasus, session.manager(), owlReasoner, tipe);
            List<String> dasar = pasal.pasal(request.topik(), session, request.fakta());
            String teks = narasi.inferensi(hak, hasil, dasar);

            return new InferResponse(
                    "inferensi", hak, hasil.rincian(), hasil.nominal(),
                    dasar, teks, "Bukan nasihat hukum.");
        });
    }
}
