package com.subastalive.pujas.web;

import com.subastalive.pujas.security.AuthenticatedUser;
import com.subastalive.pujas.security.CurrentUser;
import com.subastalive.pujas.service.PujaService;
import com.subastalive.pujas.web.dto.CrearPujaRequest;
import com.subastalive.pujas.web.dto.PrecioActualDto;
import com.subastalive.pujas.web.dto.PujaDto;
import com.subastalive.pujas.web.dto.PujaResumenDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/pujas")
public class PujaController {

    private final PujaService service;

    public PujaController(PujaService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<PujaDto> crear(@Valid @RequestBody CrearPujaRequest request,
                                          Authentication authentication,
                                          @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        AuthenticatedUser usuario = CurrentUser.resolve(authentication);
        if (!"POSTOR".equals(usuario.rol())) {
            throw new AccessDeniedException("Solo un postor puede emitir pujas.");
        }
        var puja = service.crearPuja(usuario.sub(), request.subastaId(), request.monto(), authorizationHeader);
        return ResponseEntity.status(HttpStatus.CREATED).body(PujaDto.from(puja));
    }

    @GetMapping
    public ResponseEntity<List<?>> listar(@RequestParam(required = false) UUID subastaId,
                                           @RequestParam(required = false) UUID usuarioSub) {
        if (subastaId != null) {
            return ResponseEntity.ok(service.listarPorSubasta(subastaId).stream().map(PujaDto::from).toList());
        }
        if (usuarioSub != null) {
            return ResponseEntity.ok(service.listarPorUsuario(usuarioSub).stream().map(PujaResumenDto::from).toList());
        }
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/{subastaId}/actual")
    public ResponseEntity<PrecioActualDto> actual(@PathVariable UUID subastaId) {
        return ResponseEntity.ok(service.obtenerActual(subastaId));
    }
}
