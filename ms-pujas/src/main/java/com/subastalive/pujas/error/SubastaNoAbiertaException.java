package com.subastalive.pujas.error;

import java.util.UUID;

public class SubastaNoAbiertaException extends RuntimeException {

    public SubastaNoAbiertaException(UUID subastaId) {
        super("La subasta " + subastaId + " no está en estado ABIERTA.");
    }
}
