package com.subastalive.pujas.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.UUID;

/**
 * Resuelve el usuario autenticado sin que el resto del código sepa si vino de un JWT real
 * (Cognito/Entra ID, en producción) o del filtro local simplificado (perfil "local", para pruebas).
 * El rol siempre llega como un GrantedAuthority "ROLE_<ROL>".
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static AuthenticatedUser resolve(Authentication authentication) {
        UUID sub = UUID.fromString(resolverIdentificador(authentication));
        String rol = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .findFirst()
                .orElse(null);
        return new AuthenticatedUser(sub, rol);
    }

    /**
     * El `sub` de un JWT de Entra ID es un identificador *pairwise* por aplicación, no un UUID — a
     * diferencia de Cognito, que sí emite un `sub` en formato UUID. Para Entra ID se usa en su lugar el
     * claim `oid` (Object ID del usuario en el tenant), que es un GUID estable y es el equivalente real
     * al `sub` de Cognito para este propósito. El filtro local (perfil "local") no es un
     * JwtAuthenticationToken, así que sigue resolviendo por Authentication#getName() como antes.
     */
    private static String resolverIdentificador(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            Object oid = jwt.getClaims().get("oid");
            if (oid != null) {
                return oid.toString();
            }
        }
        return authentication.getName();
    }
}
