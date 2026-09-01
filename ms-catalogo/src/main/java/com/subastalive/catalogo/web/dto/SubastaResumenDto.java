package com.subastalive.catalogo.web.dto;

import com.subastalive.catalogo.domain.Subasta;

import java.time.Instant;
import java.util.UUID;

/** Fila del listado GET /subastas — sin precioActual/totalPujas a propósito (evita N+1 hacia ms-pujas). */
public record SubastaResumenDto(UUID id, String estado, Instant fechaApertura, Instant fechaCierre,
                                 LoteResumenDto lote) {

    public static SubastaResumenDto from(Subasta subasta, LoteResumenDto lote) {
        return new SubastaResumenDto(subasta.getId(), subasta.getEstado().name(),
                subasta.getFechaApertura(), subasta.getFechaCierre(), lote);
    }
}
