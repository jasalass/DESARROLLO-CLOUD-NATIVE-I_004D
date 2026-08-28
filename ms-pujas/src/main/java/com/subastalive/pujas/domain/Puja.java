package com.subastalive.pujas.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pujas")
public class Puja {

    @Id
    private UUID id;

    @Column(name = "subasta_id", nullable = false)
    private UUID subastaId;

    @Column(name = "usuario_sub", nullable = false)
    private UUID usuarioSub;

    @Column(nullable = false)
    private BigDecimal monto;

    @Column(nullable = false)
    private Instant fecha;

    protected Puja() {
        // JPA
    }

    public Puja(UUID id, UUID subastaId, UUID usuarioSub, BigDecimal monto, Instant fecha) {
        this.id = id;
        this.subastaId = subastaId;
        this.usuarioSub = usuarioSub;
        this.monto = monto;
        this.fecha = fecha;
    }

    public UUID getId() {
        return id;
    }

    public UUID getSubastaId() {
        return subastaId;
    }

    public UUID getUsuarioSub() {
        return usuarioSub;
    }

    public BigDecimal getMonto() {
        return monto;
    }

    public Instant getFecha() {
        return fecha;
    }
}
