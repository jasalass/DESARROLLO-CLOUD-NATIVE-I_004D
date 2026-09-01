package com.subastalive.catalogo.error;

import java.util.UUID;

public class SubastaNoEncontradaException extends RuntimeException {

    public SubastaNoEncontradaException(UUID subastaId) {
        super("Subasta no encontrada: " + subastaId);
    }
}
