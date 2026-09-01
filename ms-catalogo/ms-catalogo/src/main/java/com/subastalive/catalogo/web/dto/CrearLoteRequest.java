package com.subastalive.catalogo.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CrearLoteRequest(
        @NotBlank(message = "es obligatorio") String titulo,
        String descripcion,
        @NotNull(message = "es obligatorio") @Positive(message = "debe ser mayor a 0") BigDecimal precioBase,
        @NotNull(message = "es obligatorio") @Positive(message = "debe ser mayor a 0") BigDecimal incrementoMinimo,
        String imagenUrl
) {
}
