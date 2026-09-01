package com.subastalive.catalogo.web;

import com.subastalive.catalogo.security.AuthenticatedUser;
import com.subastalive.catalogo.security.CurrentUser;
import com.subastalive.catalogo.service.LoteService;
import com.subastalive.catalogo.web.dto.CrearLoteRequest;
import com.subastalive.catalogo.web.dto.LoteDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

@RestController
public class LoteController {

    private static final Set<String> ROLES_ESCRITURA = Set.of("MARTILLERO", "ADMINISTRADOR");

    private final LoteService service;

    public LoteController(LoteService service) {
        this.service = service;
    }

    /** RF-05 — cualquier usuario autenticado puede ver el detalle de un lote. */
    @GetMapping("/lotes/{id}")
    public ResponseEntity<LoteDto> obtener(@PathVariable UUID id) {
        return ResponseEntity.ok(LoteDto.from(service.obtener(id)));
    }

    /** RF-16 — solo Martillero o Administrador pueden publicar un lote. */
    @PostMapping("/lotes")
    public ResponseEntity<LoteDto> crear(@Valid @RequestBody CrearLoteRequest request, Authentication authentication) {
        AuthenticatedUser usuario = CurrentUser.resolve(authentication);
        if (!ROLES_ESCRITURA.contains(usuario.rol())) {
            throw new AccessDeniedException("Solo un martillero o administrador puede crear un lote.");
        }
        var lote = service.crear(usuario.sub(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(LoteDto.from(lote));
    }
}
