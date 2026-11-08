package ac.id.uns.kbr.api;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> tangani(IllegalArgumentException exception) {
        return ResponseEntity.unprocessableEntity()
                .body(Map.of("detail", exception.getMessage()));
    }
}
