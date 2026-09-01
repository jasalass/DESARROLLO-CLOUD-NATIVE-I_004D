package com.subastalive.catalogo.web.dto;

import com.subastalive.catalogo.domain.Subasta;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Respuesta de GET /subastas/{id} — vista de "sala de subasta", enriquecida con datos de ms-pujas. */
public record SubastaDetalleDto(UUID id, String estado, Instant fechaApertura, Instant fechaCierre,
                                 LoteDto lote, BigDecimal precioActual, long totalPujas) {

    public static SubastaDetalleDto from(Subasta subasta, LoteDto lote, BigDecimal precioActual, long totalPujas) {
        return new SubastaDetalleDto(subasta.getId(), subasta.getEstado().name(),
                subasta.getFechaApertura(), subasta.getFechaCierre(), lote, precioActual, totalPujas);
    }
}
