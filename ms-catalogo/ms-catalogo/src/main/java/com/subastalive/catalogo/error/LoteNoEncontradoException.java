package com.subastalive.catalogo.error;

import java.util.UUID;

public class LoteNoEncontradoException extends RuntimeException {

    public LoteNoEncontradoException(UUID loteId) {
        super("Lote no encontrado: " + loteId);
    }
}
