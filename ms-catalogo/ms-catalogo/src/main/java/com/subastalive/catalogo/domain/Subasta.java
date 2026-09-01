package com.subastalive.catalogo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "subastas")
public class Subasta {

    @Id
    private UUID id;

    @Column(name = "lote_id", nullable = false)
    private UUID loteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoSubasta estado;

    @Column(name = "fecha_apertura", nullable = false)
    private Instant fechaApertura;

    @Column(name = "fecha_cierre", nullable = false)
    private Instant fechaCierre;

    protected Subasta() {
        // JPA
    }

    public Subasta(UUID id, UUID loteId, EstadoSubasta estado, Instant fechaApertura, Instant fechaCierre) {
        this.id = id;
        this.loteId = loteId;
        this.estado = estado;
        this.fechaApertura = fechaApertura;
        this.fechaCierre = fechaCierre;
    }

    public UUID getId() {
        return id;
    }

    public UUID getLoteId() {
        return loteId;
    }

    public EstadoSubasta getEstado() {
        return estado;
    }

    public void setEstado(EstadoSubasta estado) {
        this.estado = estado;
    }

    public Instant getFechaApertura() {
        return fechaApertura;
    }

    public Instant getFechaCierre() {
        return fechaCierre;
    }
}
