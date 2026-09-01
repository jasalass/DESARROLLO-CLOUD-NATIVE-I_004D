package com.subastalive.catalogo.web.dto;

import jakarta.validation.constraints.NotNull;

public record CambiarEstadoRequest(@NotNull(message = "es obligatorio") String estado) {
}
