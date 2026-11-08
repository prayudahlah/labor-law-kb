package ac.id.uns.kbr.validation;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import ac.id.uns.kbr.api.dto.InferRequest;
import ac.id.uns.kbr.api.error.ValidationError;
import ac.id.uns.kbr.api.error.ValidationException;

@Service
public class ValidationService {

    private static final Set<String> TOPIK =
            Set.of("PHK", "Lembur", "Cuti", "PKWT", "Jamsos", "KIA");

    public void validasi(InferRequest request) {
        List<ValidationError> errors = new ArrayList<>();
        String topik = request == null ? null : request.topik();

        if (topik == null || !TOPIK.contains(topik)) {
            errors.add(new ValidationError(
                    "literal_error",
                    List.of("body", "topik"),
                    "Input should be 'PHK', 'Lembur', 'Cuti', 'PKWT', 'Jamsos' or 'KIA'",
                    topik,
                    Map.of("expected", "'PHK', 'Lembur', 'Cuti', 'PKWT', 'Jamsos' or 'KIA'")));
            throw new ValidationException(errors);
        }

        Map<String, Object> fakta = request.fakta();
        if (fakta == null) {
            errors.add(new ValidationError(
                    "missing",
                    List.of("body", topik, "fakta"),
                    "Field required",
                    null,
                    null));
            throw new ValidationException(errors);
        }

        switch (topik) {
            case "PHK" -> {
                integer(fakta, topik, "masaKerjaBulan", 0, null, errors);
                positif(fakta, topik, "upahBulanan", errors);
                teksWajib(fakta, topik, "alasanPHK", errors);
                teksOpsional(fakta, topik, "bentukHubunganKerja", errors);
            }
            case "Lembur" -> {
                angkaRentang(fakta, topik, "jamLembur", 0.0, 18.0, errors);
                booleanOpsional(fakta, topik, "padaHariKerja", errors);
                positif(fakta, topik, "upahBulanan", errors);
            }
            case "Cuti" -> {
                integer(fakta, topik, "masaKerjaBulan", 0, null, errors);
                teksOpsional(fakta, topik, "peristiwa", errors);
                booleanOpsional(fakta, topik, "perempuan", errors);
            }
            case "PKWT" -> {
                literal(fakta, topik, "bentukHubunganKerja", List.of("PKWT", "PKWTT"), errors);
                integer(fakta, topik, "masaKerjaBulan", 1, null, errors);
                positif(fakta, topik, "upahBulanan", errors);
            }
            case "Jamsos" -> positif(fakta, topik, "upahBulanan", errors);
            case "KIA" -> {
                booleanOpsional(fakta, topik, "sedangCutiMelahirkan", errors);
                integer(fakta, topik, "cutiMelahirkanBulan", 3, 6, errors);
                positif(fakta, topik, "upahBulanan", errors);
            }
            default -> {
            }
        }

        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
    }

    private static void integer(
            Map<String, Object> fakta, String topik, String field,
            Integer min, Integer max, List<ValidationError> errors) {
        Object value = fakta.get(field);
        List<String> loc = loc(topik, field);
        if (value == null) {
            errors.add(missing(loc));
            return;
        }
        if (!(value instanceof Number number)) {
            errors.add(new ValidationError(
                    "int_parsing", loc,
                    "Input should be a valid integer, unable to parse string as an integer",
                    value, null));
            return;
        }
        if (number.doubleValue() != Math.rint(number.doubleValue())) {
            errors.add(new ValidationError(
                    "int_from_float", loc,
                    "Input should be a valid integer, got a number with a fractional part",
                    value, null));
            return;
        }
        int hasil = number.intValue();
        if (min != null && hasil < min) {
            Map<String, Object> ctx = new LinkedHashMap<>();
            ctx.put("ge", min);
            errors.add(new ValidationError(
                    "greater_than_equal", loc,
                    "Input should be greater than or equal to " + min, value, ctx));
        }
        if (max != null && hasil > max) {
            Map<String, Object> ctx = new LinkedHashMap<>();
            ctx.put("le", max);
            errors.add(new ValidationError(
                    "less_than_equal", loc,
                    "Input should be less than or equal to " + max, value, ctx));
        }
    }

    private static void positif(
            Map<String, Object> fakta, String topik, String field,
            List<ValidationError> errors) {
        Object value = fakta.get(field);
        List<String> loc = loc(topik, field);
        if (value == null) {
            errors.add(missing(loc));
            return;
        }
        if (!(value instanceof Number number)) {
            errors.add(new ValidationError(
                    "float_parsing", loc,
                    "Input should be a valid number, unable to parse string as a number",
                    value, null));
            return;
        }
        if (number.doubleValue() <= 0) {
            Map<String, Object> ctx = new LinkedHashMap<>();
            ctx.put("gt", 0.0);
            errors.add(new ValidationError(
                    "greater_than", loc,
                    "Input should be greater than 0", value, ctx));
        }
    }

    private static void angkaRentang(
            Map<String, Object> fakta, String topik, String field,
            double gt, double le, List<ValidationError> errors) {
        Object value = fakta.get(field);
        List<String> loc = loc(topik, field);
        if (value == null) {
            errors.add(missing(loc));
            return;
        }
        if (!(value instanceof Number number)) {
            errors.add(new ValidationError(
                    "float_parsing", loc,
                    "Input should be a valid number, unable to parse string as a number",
                    value, null));
            return;
        }
        if (number.doubleValue() <= gt) {
            Map<String, Object> ctx = new LinkedHashMap<>();
            ctx.put("gt", gt);
            errors.add(new ValidationError(
                    "greater_than", loc,
                    "Input should be greater than " + format(gt), value, ctx));
        }
        if (number.doubleValue() > le) {
            Map<String, Object> ctx = new LinkedHashMap<>();
            ctx.put("le", le);
            errors.add(new ValidationError(
                    "less_than_equal", loc,
                    "Input should be less than or equal to " + format(le), value, ctx));
        }
    }

    private static void teksWajib(
            Map<String, Object> fakta, String topik, String field,
            List<ValidationError> errors) {
        Object value = fakta.get(field);
        List<String> loc = loc(topik, field);
        if (value == null) {
            errors.add(missing(loc));
            return;
        }
        if (!(value instanceof String)) {
            errors.add(new ValidationError(
                    "string_type", loc,
                    "Input should be a valid string", value, null));
            return;
        }
        String teks = (String) value;
        if (teks.isBlank()) {
            errors.add(new ValidationError(
                    "value_error", loc,
                    "Value error, " + field + " tidak boleh kosong", value, null));
        }
    }

    private static void teksOpsional(
            Map<String, Object> fakta, String topik, String field,
            List<ValidationError> errors) {
        Object value = fakta.get(field);
        if (value != null && !(value instanceof String)) {
            errors.add(new ValidationError(
                    "string_type", loc(topik, field),
                    "Input should be a valid string", value, null));
        }
    }

    private static void booleanOpsional(
            Map<String, Object> fakta, String topik, String field,
            List<ValidationError> errors) {
        Object value = fakta.get(field);
        if (value != null && !(value instanceof Boolean)) {
            errors.add(new ValidationError(
                    "bool_parsing", loc(topik, field),
                    "Input should be a valid boolean, unable to interpret input",
                    value, null));
        }
    }

    private static void literal(
            Map<String, Object> fakta, String topik, String field,
            List<String> allowed, List<ValidationError> errors) {
        Object value = fakta.get(field);
        List<String> loc = loc(topik, field);
        if (value == null) {
            errors.add(missing(loc));
            return;
        }
        if (!(value instanceof String)) {
            errors.add(new ValidationError(
                    "literal_error", loc,
                    "Input should be " + String.join(" or ", allowed), value,
                    Map.of("expected", String.join(" or ", allowed))));
            return;
        }
        String teks = (String) value;
        if (!allowed.contains(teks)) {
            errors.add(new ValidationError(
                    "literal_error", loc,
                    "Input should be " + String.join(" or ", allowed), value,
                    Map.of("expected", String.join(" or ", allowed))));
        }
    }

    private static ValidationError missing(List<String> loc) {
        return new ValidationError("missing", loc, "Field required", null, null);
    }

    private static List<String> loc(String topik, String field) {
        return List.of("body", topik, "fakta", field);
    }

    private static String format(double value) {
        return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(value);
    }
}
