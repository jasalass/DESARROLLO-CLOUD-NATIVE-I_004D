package com.subastalive.catalogo.web.dto;

import com.subastalive.catalogo.domain.Lote;

import java.math.BigDecimal;
import java.util.UUID;

/** Versión liviana del lote, usada dentro de GET /subastas (evita mandar descripcion/incrementoMinimo). */
public record LoteResumenDto(UUID id, String titulo, BigDecimal precioBase, String imagenUrl) {

    public static LoteResumenDto from(Lote lote) {
        return new LoteResumenDto(lote.getId(), lote.getTitulo(), lote.getPrecioBase(), lote.getImagenUrl());
    }
}
