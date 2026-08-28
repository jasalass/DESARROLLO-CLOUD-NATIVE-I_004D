package com.subastalive.pujas.web.dto;

import com.subastalive.pujas.domain.Puja;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Sin usuarioSub a propósito — se usa en GET /pujas?usuarioSub=, donde el filtro ya lo deja implícito. */
public record PujaResumenDto(UUID id, UUID subastaId, BigDecimal monto, Instant fecha) {

    public static PujaResumenDto from(Puja puja) {
        return new PujaResumenDto(puja.getId(), puja.getSubastaId(), puja.getMonto(), puja.getFecha());
    }
}
