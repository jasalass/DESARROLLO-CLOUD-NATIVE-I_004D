package com.subastalive.catalogo.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

import java.util.UUID;

/**
 * Resuelve el usuario autenticado sin que el resto del código sepa si vino de un JWT real
 * (Cognito/Entra ID, en producción) o del filtro local simplificado (perfil "local", para pruebas).
 * Ambos dejan el `sub` como Authentication#getName() y el rol como un GrantedAuthority "ROLE_<ROL>".
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static AuthenticatedUser resolve(Authentication authentication) {
        UUID sub = UUID.fromString(authentication.getName());
        String rol = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .findFirst()
                .orElse(null);
        return new AuthenticatedUser(sub, rol);
    }
}
