package com.subastalive.pujas.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PujaRepository extends JpaRepository<Puja, UUID> {

    List<Puja> findBySubastaIdOrderByFechaDesc(UUID subastaId);

    List<Puja> findByUsuarioSubOrderByFechaDesc(UUID usuarioSub);

    @Query("select max(p.monto) from Puja p where p.subastaId = :subastaId")
    Optional<BigDecimal> findMontoMaximoBySubastaId(@Param("subastaId") UUID subastaId);

    @Query("select max(p.fecha) from Puja p where p.subastaId = :subastaId")
    Optional<Instant> findUltimaFechaBySubastaId(@Param("subastaId") UUID subastaId);

    long countBySubastaId(UUID subastaId);
}
