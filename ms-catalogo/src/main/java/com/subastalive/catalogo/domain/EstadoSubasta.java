package com.subastalive.catalogo.domain;

/**
 * Máquina de estados de una Subasta (ver ms-catalogo/README.md, sección "Modelo de datos").
 * Transiciones válidas: PROGRAMADA -> ABIERTA -> CERRADA -> ADJUDICADA.
 * Cualquier otra combinación es inválida y debe responder 409 TRANSICION_INVALIDA.
 */
public enum EstadoSubasta {
    PROGRAMADA,
    ABIERTA,
    CERRADA,
    ADJUDICADA;

    /** true si se puede pasar de este estado al estado `destino`. */
    public boolean puedeTransicionarA(EstadoSubasta destino) {
        return switch (this) {
            case PROGRAMADA -> destino == ABIERTA;
            case ABIERTA -> destino == CERRADA;
            case CERRADA -> destino == ADJUDICADA;
            case ADJUDICADA -> false;
        };
    }
}
