package com.subastalive.pujas.web.dto;

import com.subastalive.pujas.domain.Puja;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Objeto Puja completo — usado en la respuesta de POST /pujas y en GET /pujas?subastaId=. */
public record PujaDto(UUID id, UUID subastaId, UUID usuarioSub, BigDecimal monto, Instant fecha) {

    public static PujaDto from(Puja puja) {
        return new PujaDto(puja.getId(), puja.getSubastaId(), puja.getUsuarioSub(), puja.getMonto(), puja.getFecha());
    }
}
