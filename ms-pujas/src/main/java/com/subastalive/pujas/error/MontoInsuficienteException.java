package com.subastalive.pujas.error;

import java.math.BigDecimal;

public class MontoInsuficienteException extends RuntimeException {

    private final BigDecimal montoMinimoRequerido;

    public MontoInsuficienteException(BigDecimal montoMinimoRequerido) {
        super("El monto debe ser al menos " + montoMinimoRequerido + ".");
        this.montoMinimoRequerido = montoMinimoRequerido;
    }

    public BigDecimal getMontoMinimoRequerido() {
        return montoMinimoRequerido;
    }
}
