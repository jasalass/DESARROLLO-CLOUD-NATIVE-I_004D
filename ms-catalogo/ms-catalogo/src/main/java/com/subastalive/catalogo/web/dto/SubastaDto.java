package com.subastalive.catalogo.web.dto;

import com.subastalive.catalogo.domain.Subasta;

import java.time.Instant;
import java.util.UUID;

/** Objeto Subasta "plano" — usado en las respuestas de POST /subastas y PATCH /subastas/{id}/estado. */
public record SubastaDto(UUID id, UUID loteId, String estado, Instant fechaApertura, Instant fechaCierre) {

    public static SubastaDto from(Subasta subasta) {
        return new SubastaDto(subasta.getId(), subasta.getLoteId(), subasta.getEstado().name(),
                subasta.getFechaApertura(), subasta.getFechaCierre());
    }
}
