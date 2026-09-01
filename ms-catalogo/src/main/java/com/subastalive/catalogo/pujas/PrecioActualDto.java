package com.subastalive.catalogo.pujas;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Respuesta de GET /pujas/{subastaId}/actual en ms-pujas — ver ../ms-pujas/README.md. */
public record PrecioActualDto(UUID subastaId, BigDecimal montoActual, long totalPujas, Instant ultimaPujaFecha) {
}
