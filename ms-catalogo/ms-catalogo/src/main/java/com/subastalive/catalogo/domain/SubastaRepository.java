package com.subastalive.catalogo.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SubastaRepository extends JpaRepository<Subasta, UUID> {

    List<Subasta> findByEstado(EstadoSubasta estado);

    boolean existsByLoteIdAndEstadoIn(UUID loteId, List<EstadoSubasta> estados);

    // Usada por el scheduler de cierre automático (RF-18): subastas ABIERTA cuya fechaCierre ya pasó.
    List<Subasta> findByEstadoAndFechaCierreBefore(EstadoSubasta estado, Instant instante);
}
