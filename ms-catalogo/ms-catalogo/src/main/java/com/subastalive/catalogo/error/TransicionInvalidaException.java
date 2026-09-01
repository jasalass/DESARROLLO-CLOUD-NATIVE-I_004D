package com.subastalive.catalogo.error;

import com.subastalive.catalogo.domain.EstadoSubasta;

public class TransicionInvalidaException extends RuntimeException {

    public TransicionInvalidaException(EstadoSubasta actual, EstadoSubasta destino) {
        super("No se puede transicionar de " + actual + " a " + destino + ".");
    }
}
