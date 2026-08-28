package com.subastalive.pujas.catalogo;

import java.math.BigDecimal;
import java.util.UUID;

/** Respuesta de GET /subastas/{id}/reglas en ms-catalogo — ver ../ms-catalogo/README.md. */
public record ReglasSubastaDto(UUID id, String estado, BigDecimal precioBase, BigDecimal incrementoMinimo) {
}
