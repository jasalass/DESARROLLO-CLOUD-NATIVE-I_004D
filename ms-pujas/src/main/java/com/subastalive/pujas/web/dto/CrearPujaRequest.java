package com.subastalive.pujas.web.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record CrearPujaRequest(
        @NotNull UUID subastaId,
        @NotNull @Positive BigDecimal monto
) {
}
