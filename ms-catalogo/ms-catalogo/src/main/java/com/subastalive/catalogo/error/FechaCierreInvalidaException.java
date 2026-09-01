package com.subastalive.catalogo.error;

/**
 * Decisión tomada (no cubierta explícitamente por el README): fechaCierre debe ser posterior a
 * fechaApertura. La tabla ya tiene un CHECK a nivel de base de datos; esta excepción evita depender de
 * que ese CHECK falle (lo que devolvería un 500 genérico) y en cambio responde 400 VALIDACION, consistente
 * con el resto de las validaciones de entrada.
 */
public class FechaCierreInvalidaException extends RuntimeException {

    public FechaCierreInvalidaException() {
        super("fechaCierre debe ser posterior a fechaApertura");
    }
}
