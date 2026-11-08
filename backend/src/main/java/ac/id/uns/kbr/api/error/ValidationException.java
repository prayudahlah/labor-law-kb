package ac.id.uns.kbr.api.error;

import java.util.List;

public class ValidationException extends RuntimeException {

    private final List<ValidationError> errors;

    public ValidationException(List<ValidationError> errors) {
        super("validasi gagal");
        this.errors = List.copyOf(errors);
    }

    public List<ValidationError> errors() {
        return errors;
    }
}
