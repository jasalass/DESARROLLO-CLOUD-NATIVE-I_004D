package com.subastalive.catalogo.web.dto;

import com.subastalive.catalogo.domain.Lote;

import java.math.BigDecimal;
import java.util.UUID;

/** Objeto Lote completo — ver ms-catalogo/README.md, sección "Modelo de datos". */
public record LoteDto(UUID id, UUID martilleroSub, String titulo, String descripcion,
                       BigDecimal precioBase, BigDecimal incrementoMinimo, String imagenUrl) {

    public static LoteDto from(Lote lote) {
        return new LoteDto(lote.getId(), lote.getMartilleroSub(), lote.getTitulo(), lote.getDescripcion(),
                lote.getPrecioBase(), lote.getIncrementoMinimo(), lote.getImagenUrl());
    }
}
