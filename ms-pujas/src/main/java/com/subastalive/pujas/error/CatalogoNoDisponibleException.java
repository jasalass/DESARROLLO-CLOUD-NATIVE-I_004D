package com.subastalive.pujas.error;

import java.util.UUID;

public class CatalogoNoDisponibleException extends RuntimeException {

    public CatalogoNoDisponibleException(UUID subastaId, Throwable causa) {
        super("No se pudo validar la subasta " + subastaId + " contra ms-catalogo.", causa);
    }
}
