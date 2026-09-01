package com.subastalive.catalogo.web;

import com.subastalive.catalogo.error.FechaCierreInvalidaException;
import com.subastalive.catalogo.error.LoteNoEncontradoException;
import com.subastalive.catalogo.error.LoteYaEnSubastaException;
import com.subastalive.catalogo.error.SubastaNoEncontradaException;
import com.subastalive.catalogo.error.TransicionInvalidaException;
import com.subastalive.catalogo.web.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(LoteNoEncontradoException.class)
    public ResponseEntity<ErrorResponse> handleLoteNoEncontrado(LoteNoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of("NO_ENCONTRADO", ex.getMessage()));
    }

    @ExceptionHandler(SubastaNoEncontradaException.class)
    public ResponseEntity<ErrorResponse> handleSubastaNoEncontrada(SubastaNoEncontradaException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of("NO_ENCONTRADO", ex.getMessage()));
    }

    @ExceptionHandler(LoteYaEnSubastaException.class)
    public ResponseEntity<ErrorResponse> handleLoteYaEnSubasta(LoteYaEnSubastaException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of("LOTE_YA_EN_SUBASTA", ex.getMessage()));
    }

    @ExceptionHandler(TransicionInvalidaException.class)
    public ResponseEntity<ErrorResponse> handleTransicionInvalida(TransicionInvalidaException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of("TRANSICION_INVALIDA", ex.getMessage()));
    }

    @ExceptionHandler(FechaCierreInvalidaException.class)
    public ResponseEntity<ErrorResponse> handleFechaCierreInvalida(FechaCierreInvalidaException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of("VALIDACION", ex.getMessage(), Map.of("campo", "fechaCierre")));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        // Cubre, entre otros casos, un valor de "estado" en el body que no coincide con ningún EstadoSubasta.
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of("VALIDACION", "Valor inválido: " + ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of("PROHIBIDO", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidacion(MethodArgumentNotValidException ex) {
        FieldError fieldError = ex.getBindingResult().getFieldErrors().stream().findFirst().orElse(null);
        if (fieldError == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ErrorResponse.of("VALIDACION", "Solicitud inválida."));
        }
        String mensaje = fieldError.getField() + " " + fieldError.getDefaultMessage();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of("VALIDACION", mensaje, Map.of("campo", fieldError.getField())));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenerico(Exception ex) {
        log.error("Error inesperado procesando la solicitud", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("ERROR_INTERNO", "Ocurrió un error inesperado."));
    }
}
