package com.subastalive.catalogo.service;

import com.subastalive.catalogo.domain.EstadoSubasta;
import com.subastalive.catalogo.domain.Lote;
import com.subastalive.catalogo.domain.Subasta;
import com.subastalive.catalogo.domain.SubastaRepository;
import com.subastalive.catalogo.error.FechaCierreInvalidaException;
import com.subastalive.catalogo.error.LoteYaEnSubastaException;
import com.subastalive.catalogo.error.SubastaNoEncontradaException;
import com.subastalive.catalogo.error.TransicionInvalidaException;
import com.subastalive.catalogo.pujas.PrecioActualDto;
import com.subastalive.catalogo.pujas.PujasClient;
import com.subastalive.catalogo.web.dto.CrearSubastaRequest;
import com.subastalive.catalogo.web.dto.LoteDto;
import com.subastalive.catalogo.web.dto.LoteResumenDto;
import com.subastalive.catalogo.web.dto.SubastaDetalleDto;
import com.subastalive.catalogo.web.dto.SubastaResumenDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SubastaService {

    private static final List<EstadoSubasta> ESTADOS_ACTIVOS = List.of(EstadoSubasta.PROGRAMADA, EstadoSubasta.ABIERTA);

    private final SubastaRepository subastaRepository;
    private final LoteService loteService;
    private final PujasClient pujasClient;

    public SubastaService(SubastaRepository subastaRepository, LoteService loteService, PujasClient pujasClient) {
        this.subastaRepository = subastaRepository;
        this.loteService = loteService;
        this.pujasClient = pujasClient;
    }

    /** RF-04 — listado liviano, sin precio vigente (evita N+1 hacia ms-pujas, ver README). */
    public List<SubastaResumenDto> listar(EstadoSubasta filtroEstado) {
        List<Subasta> subastas = filtroEstado != null
                ? subastaRepository.findByEstado(filtroEstado)
                : subastaRepository.findAll();
        return subastas.stream()
                .map(subasta -> {
                    Lote lote = loteService.obtener(subasta.getLoteId());
                    return SubastaResumenDto.from(subasta, LoteResumenDto.from(lote));
                })
                .toList();
    }

    public Subasta obtener(UUID id) {
        return subastaRepository.findById(id).orElseThrow(() -> new SubastaNoEncontradaException(id));
    }

    /** RF-04, RF-05 — detalle enriquecido con el precio vigente resuelto vía ms-pujas. */
    public SubastaDetalleDto obtenerDetalle(UUID id, String authorizationHeader) {
        Subasta subasta = obtener(id);
        Lote lote = loteService.obtener(subasta.getLoteId());

        BigDecimal precioActual = lote.getPrecioBase();
        long totalPujas = 0;

        var respuesta = pujasClient.obtenerActual(id, authorizationHeader);
        if (respuesta.isPresent()) {
            PrecioActualDto precio = respuesta.get();
            if (precio.montoActual() != null) {
                precioActual = precio.montoActual();
            }
            totalPujas = precio.totalPujas();
        }

        return SubastaDetalleDto.from(subasta, LoteDto.from(lote), precioActual, totalPujas);
    }

    /** Endpoint interno que usa ms-pujas antes de aceptar una puja (ver README, "Comunicación..."). */
    public com.subastalive.catalogo.web.dto.ReglasSubastaDto obtenerReglas(UUID id) {
        Subasta subasta = obtener(id);
        Lote lote = loteService.obtener(subasta.getLoteId());
        return com.subastalive.catalogo.web.dto.ReglasSubastaDto.from(subasta, lote);
    }

    /** RF-17 — programa apertura/cierre de una subasta sobre un lote existente. */
    public Subasta crear(CrearSubastaRequest request) {
        Lote lote = loteService.obtener(request.loteId()); // 404 si el lote no existe

        if (!request.fechaCierre().isAfter(request.fechaApertura())) {
            throw new FechaCierreInvalidaException();
        }
        if (subastaRepository.existsByLoteIdAndEstadoIn(lote.getId(), ESTADOS_ACTIVOS)) {
            throw new LoteYaEnSubastaException(lote.getId());
        }

        Subasta subasta = new Subasta(UUID.randomUUID(), lote.getId(), EstadoSubasta.PROGRAMADA,
                request.fechaApertura(), request.fechaCierre());
        return subastaRepository.save(subasta);
    }

    /** RF-18 — transiciona el estado de una subasta según la máquina de estados (ver EstadoSubasta). */
    public Subasta cambiarEstado(UUID id, EstadoSubasta nuevoEstado) {
        Subasta subasta = obtener(id);
        if (!subasta.getEstado().puedeTransicionarA(nuevoEstado)) {
            throw new TransicionInvalidaException(subasta.getEstado(), nuevoEstado);
        }
        subasta.setEstado(nuevoEstado);
        return subastaRepository.save(subasta);
    }

    /**
     * RF-18, decisión "cierre automático": usada por el scheduler para cerrar subastas ABIERTA cuya
     * fechaCierre ya pasó, reusando la misma lógica de transición que el PATCH externo.
     */
    public List<Subasta> cerrarSubastasVencidas() {
        List<Subasta> vencidas = subastaRepository.findByEstadoAndFechaCierreBefore(EstadoSubasta.ABIERTA, Instant.now());
        return vencidas.stream()
                .map(subasta -> cambiarEstado(subasta.getId(), EstadoSubasta.CERRADA))
                .toList();
    }

    public boolean esDuenioDelLote(Subasta subasta, UUID martilleroSub) {
        return loteService.obtener(subasta.getLoteId()).getMartilleroSub().equals(martilleroSub);
    }

    public boolean esDuenioDelLote(UUID loteId, UUID martilleroSub) {
        return loteService.obtener(loteId).getMartilleroSub().equals(martilleroSub);
    }
}
