package com.subastalive.catalogo.service;

import com.subastalive.catalogo.domain.Lote;
import com.subastalive.catalogo.domain.LoteRepository;
import com.subastalive.catalogo.error.LoteNoEncontradoException;
import com.subastalive.catalogo.web.dto.CrearLoteRequest;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class LoteService {

    private final LoteRepository repository;

    public LoteService(LoteRepository repository) {
        this.repository = repository;
    }

    /** RF-16 — martilleroSub siempre sale del token, nunca del body (ver README). */
    public Lote crear(UUID martilleroSub, CrearLoteRequest request) {
        Lote lote = new Lote(UUID.randomUUID(), martilleroSub, request.titulo(), request.descripcion(),
                request.precioBase(), request.incrementoMinimo(), request.imagenUrl());
        return repository.save(lote);
    }

    public Lote obtener(UUID id) {
        return repository.findById(id).orElseThrow(() -> new LoteNoEncontradoException(id));
    }
}
