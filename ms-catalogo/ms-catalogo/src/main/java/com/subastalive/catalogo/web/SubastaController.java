package com.subastalive.catalogo.web;

import com.subastalive.catalogo.domain.EstadoSubasta;
import com.subastalive.catalogo.security.AuthenticatedUser;
import com.subastalive.catalogo.security.CurrentUser;
import com.subastalive.catalogo.service.SubastaService;
import com.subastalive.catalogo.web.dto.CambiarEstadoRequest;
import com.subastalive.catalogo.web.dto.CrearSubastaRequest;
import com.subastalive.catalogo.web.dto.ReglasSubastaDto;
import com.subastalive.catalogo.web.dto.SubastaDetalleDto;
import com.subastalive.catalogo.web.dto.SubastaDto;
import com.subastalive.catalogo.web.dto.SubastaResumenDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/subastas")
public class SubastaController {

    private static final Set<String> ROLES_ESCRITURA = Set.of("MARTILLERO", "ADMINISTRADOR");

    private final SubastaService service;

    public SubastaController(SubastaService service) {
        this.service = service;
    }

    /** RF-04 — listado de subastas, filtro opcional por estado. */
    @GetMapping
    public ResponseEntity<Iterable<SubastaResumenDto>> listar(@RequestParam(required = false) String estado) {
        EstadoSubasta filtro = estado != null ? EstadoSubasta.valueOf(estado) : null;
        return ResponseEntity.ok(service.listar(filtro));
    }

    /** RF-04, RF-05 — detalle para la vista de "sala de subasta"; enriquece con ms-pujas. */
    @GetMapping("/{id}")
    public ResponseEntity<SubastaDetalleDto> obtener(@PathVariable UUID id,
                                                       @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        return ResponseEntity.ok(service.obtenerDetalle(id, authorizationHeader));
    }

    /** Endpoint interno: lo usa ms-pujas para validar una puja sin encadenar otra llamada hacia sí mismo. */
    @GetMapping("/{id}/reglas")
    public ResponseEntity<ReglasSubastaDto> reglas(@PathVariable UUID id) {
        return ResponseEntity.ok(service.obtenerReglas(id));
    }

    /** RF-17 — programa apertura/cierre. Solo el martillero dueño del lote, o un administrador. */
    @PostMapping
    public ResponseEntity<SubastaDto> crear(@Valid @RequestBody CrearSubastaRequest request, Authentication authentication) {
        AuthenticatedUser usuario = CurrentUser.resolve(authentication);
        if (!ROLES_ESCRITURA.contains(usuario.rol())) {
            throw new AccessDeniedException("Solo un martillero o administrador puede programar una subasta.");
        }
        if ("MARTILLERO".equals(usuario.rol()) && !service.esDuenioDelLote(request.loteId(), usuario.sub())) {
            throw new AccessDeniedException("Solo el martillero dueño del lote puede programar su subasta.");
        }
        var subasta = service.crear(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(SubastaDto.from(subasta));
    }

    /** RF-18 — transiciona el estado de una subasta. Solo Martillero o Administrador (vía HTTP;
     * el cierre automático por vencimiento lo dispara el scheduler internamente, sin pasar por acá). */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<SubastaDto> cambiarEstado(@PathVariable UUID id,
                                                      @Valid @RequestBody CambiarEstadoRequest request,
                                                      Authentication authentication) {
        AuthenticatedUser usuario = CurrentUser.resolve(authentication);
        if (!ROLES_ESCRITURA.contains(usuario.rol())) {
            throw new AccessDeniedException("Solo un martillero o administrador puede cambiar el estado de una subasta.");
        }
        EstadoSubasta nuevoEstado = EstadoSubasta.valueOf(request.estado());
        var subasta = service.cambiarEstado(id, nuevoEstado);
        return ResponseEntity.ok(SubastaDto.from(subasta));
    }
}
