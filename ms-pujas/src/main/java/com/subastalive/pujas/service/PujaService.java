package com.subastalive.pujas.service;

import com.subastalive.pujas.catalogo.CatalogoClient;
import com.subastalive.pujas.catalogo.ReglasSubastaDto;
import com.subastalive.pujas.domain.Puja;
import com.subastalive.pujas.domain.PujaRepository;
import com.subastalive.pujas.error.MontoInsuficienteException;
import com.subastalive.pujas.error.SubastaNoAbiertaException;
import com.subastalive.pujas.web.dto.PrecioActualDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class PujaService {

    private static final String ESTADO_ABIERTA = "ABIERTA";

    private final PujaRepository repository;
    private final CatalogoClient catalogoClient;

    public PujaService(PujaRepository repository, CatalogoClient catalogoClient) {
        this.repository = repository;
        this.catalogoClient = catalogoClient;
    }

    /** RF-06, RF-07, RF-08 — ver ms-pujas/README.md, sección "Reglas de negocio". */
    public Puja crearPuja(UUID usuarioSub, UUID subastaId, BigDecimal monto, String authorizationHeader) {
        ReglasSubastaDto reglas = catalogoClient.obtenerReglas(subastaId, authorizationHeader);

        if (!ESTADO_ABIERTA.equals(reglas.estado())) {
            throw new SubastaNoAbiertaException(subastaId);
        }

        BigDecimal precioVigente = repository.findMontoMaximoBySubastaId(subastaId).orElse(reglas.precioBase());
        BigDecimal montoMinimoRequerido = precioVigente.add(reglas.incrementoMinimo());
        if (monto.compareTo(montoMinimoRequerido) < 0) {
            throw new MontoInsuficienteException(montoMinimoRequerido);
        }

        Puja puja = new Puja(UUID.randomUUID(), subastaId, usuarioSub, monto, Instant.now());
        return repository.save(puja);
    }

    public List<Puja> listarPorSubasta(UUID subastaId) {
        return repository.findBySubastaIdOrderByFechaDesc(subastaId);
    }

    public List<Puja> listarPorUsuario(UUID usuarioSub) {
        return repository.findByUsuarioSubOrderByFechaDesc(usuarioSub);
    }

    public PrecioActualDto obtenerActual(UUID subastaId) {
        BigDecimal montoActual = repository.findMontoMaximoBySubastaId(subastaId).orElse(null);
        long totalPujas = repository.countBySubastaId(subastaId);
        Instant ultimaPujaFecha = repository.findUltimaFechaBySubastaId(subastaId).orElse(null);
        return new PrecioActualDto(subastaId, montoActual, totalPujas, ultimaPujaFecha);
    }
}
