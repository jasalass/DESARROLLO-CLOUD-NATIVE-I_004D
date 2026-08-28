package com.subastalive.pujas.web.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PrecioActualDto(UUID subastaId, BigDecimal montoActual, long totalPujas, Instant ultimaPujaFecha) {
}
