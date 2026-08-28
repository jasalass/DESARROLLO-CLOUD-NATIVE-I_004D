package com.subastalive.pujas.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Solo activo con el perfil "local" (ver LocalSecurityConfig). Reemplaza la validación real de JWT
 * por un formato de token trivial para poder probar la app completa (frontend en modo mock incluido)
 * sin necesitar un Cognito/Entra ID real: "Authorization: Bearer local:<sub>:<ROL>".
 *
 * Nunca se activa fuera del perfil "local" — en cualquier otro entorno la seguridad real la resuelve
 * SecurityConfig contra los issuers configurados.
 */
public class LocalTokenAuthFilter extends OncePerRequestFilter {

    private static final String PREFIX = "Bearer local:";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(PREFIX)) {
            String[] parts = header.substring(PREFIX.length()).split(":", 2);
            if (parts.length == 2) {
                String sub = parts[0];
                String rol = parts[1];
                var authentication = new UsernamePasswordAuthenticationToken(
                        sub, null, List.of(new SimpleGrantedAuthority("ROLE_" + rol)));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        chain.doFilter(request, response);
    }
}
