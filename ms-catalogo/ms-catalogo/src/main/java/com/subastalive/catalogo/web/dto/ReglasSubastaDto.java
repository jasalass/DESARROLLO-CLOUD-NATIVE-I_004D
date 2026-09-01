package com.subastalive.catalogo.web.dto;

import com.subastalive.catalogo.domain.Lote;
import com.subastalive.catalogo.domain.Subasta;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Respuesta de GET /subastas/{id}/reglas — endpoint interno que usa ms-pujas para validar una puja
 * (ver ms-pujas/catalogo/ReglasSubastaDto.java, debe tener exactamente esta forma).
 */
public record ReglasSubastaDto(UUID id, String estado, BigDecimal precioBase, BigDecimal incrementoMinimo) {

    public static ReglasSubastaDto from(Subasta subasta, Lote lote) {
        return new ReglasSubastaDto(subasta.getId(), subasta.getEstado().name(),
                lote.getPrecioBase(), lote.getIncrementoMinimo());
    }
}
