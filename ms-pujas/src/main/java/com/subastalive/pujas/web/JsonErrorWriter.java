package com.subastalive.pujas.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.subastalive.pujas.web.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** Escribe el formato de error estándar directamente a la respuesta, para usarlo desde la capa de seguridad
 * (entry points / access denied handlers), donde todavía no hay un @ExceptionHandler disponible. */
@Component
public class JsonErrorWriter {

    private final ObjectMapper objectMapper;

    public JsonErrorWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void write(HttpServletResponse response, int status, String codigo, String mensaje) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        objectMapper.writeValue(response.getWriter(), ErrorResponse.of(codigo, mensaje));
    }
}
