package com.subastalive.catalogo.web.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public record CrearSubastaRequest(
        @NotNull(message = "es obligatorio") UUID loteId,
        @NotNull(message = "es obligatoria") Instant fechaApertura,
        @NotNull(message = "es obligatoria") Instant fechaCierre
) {
}
