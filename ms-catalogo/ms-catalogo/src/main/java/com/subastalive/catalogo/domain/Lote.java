package com.subastalive.catalogo.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "lotes")
public class Lote {

    @Id
    private UUID id;

    @Column(name = "martillero_sub", nullable = false)
    private UUID martilleroSub;

    @Column(nullable = false)
    private String titulo;

    @Column
    private String descripcion;

    @Column(name = "precio_base", nullable = false)
    private BigDecimal precioBase;

    @Column(name = "incremento_minimo", nullable = false)
    private BigDecimal incrementoMinimo;

    @Column(name = "imagen_url")
    private String imagenUrl;

    protected Lote() {
        // JPA
    }

    public Lote(UUID id, UUID martilleroSub, String titulo, String descripcion,
                BigDecimal precioBase, BigDecimal incrementoMinimo, String imagenUrl) {
        this.id = id;
        this.martilleroSub = martilleroSub;
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.precioBase = precioBase;
        this.incrementoMinimo = incrementoMinimo;
        this.imagenUrl = imagenUrl;
    }

    public UUID getId() {
        return id;
    }

    public UUID getMartilleroSub() {
        return martilleroSub;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public BigDecimal getPrecioBase() {
        return precioBase;
    }

    public BigDecimal getIncrementoMinimo() {
        return incrementoMinimo;
    }

    public String getImagenUrl() {
        return imagenUrl;
    }
}
