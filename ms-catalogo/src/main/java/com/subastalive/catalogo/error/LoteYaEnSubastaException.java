package com.subastalive.catalogo.error;

import java.util.UUID;

public class LoteYaEnSubastaException extends RuntimeException {

    public LoteYaEnSubastaException(UUID loteId) {
        super("El lote " + loteId + " ya tiene una subasta activa.");
    }
}
