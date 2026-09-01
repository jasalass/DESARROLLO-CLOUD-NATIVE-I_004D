package com.subastalive.catalogo.web.dto;

/** Formato de error estándar compartido por los tres microservicios (ver README principal). */
public record ErrorResponse(String codigo, String mensaje, Object detalles) {

    public static ErrorResponse of(String codigo, String mensaje) {
        return new ErrorResponse(codigo, mensaje, null);
    }

    public static ErrorResponse of(String codigo, String mensaje, Object detalles) {
        return new ErrorResponse(codigo, mensaje, detalles);
    }
}
