package com.subastalive.pujas.web;

import com.subastalive.pujas.error.CatalogoNoDisponibleException;
import com.subastalive.pujas.error.MontoInsuficienteException;
import com.subastalive.pujas.error.SubastaNoAbiertaException;
import com.subastalive.pujas.error.SubastaNoEncontradaException;
import com.subastalive.pujas.web.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(SubastaNoAbiertaException.class)
    public ResponseEntity<ErrorResponse> handleSubastaNoAbierta(SubastaNoAbiertaException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of("SUBASTA_NO_ABIERTA", ex.getMessage()));
    }

    @ExceptionHandler(MontoInsuficienteException.class)
    public ResponseEntity<ErrorResponse> handleMontoInsuficiente(MontoInsuficienteException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of("MONTO_INSUFICIENTE", ex.getMessage(),
                        Map.of("montoMinimoRequerido", ex.getMontoMinimoRequerido())));
    }

    @ExceptionHandler(SubastaNoEncontradaException.class)
    public ResponseEntity<ErrorResponse> handleSubastaNoEncontrada(SubastaNoEncontradaException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of("NO_ENCONTRADO", ex.getMessage()));
    }

    @ExceptionHandler(CatalogoNoDisponibleException.class)
    public ResponseEntity<ErrorResponse> handleCatalogoNoDisponible(CatalogoNoDisponibleException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(ErrorResponse.of("CATALOGO_NO_DISPONIBLE", ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of("PROHIBIDO", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidacion(MethodArgumentNotValidException ex) {
        String mensaje = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .findFirst()
                .orElse("Solicitud inválida.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of("VALIDACION", mensaje));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenerico(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("ERROR_INTERNO", "Ocurrió un error inesperado."));
    }
}
