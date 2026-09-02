package com.subastalive.catalogo.security;

import com.subastalive.catalogo.web.JsonErrorWriter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationManagerResolver;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationProvider;
import org.springframework.security.oauth2.server.resource.authentication.JwtIssuerAuthenticationManagerResolver;
import org.springframework.security.web.SecurityFilterChain;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Seguridad real: valida el JWT contra los dos proveedores de identidad (Cognito y Entra ID) — RF-29, RF-33.
 * No se activa con el perfil "local" (ver LocalSecurityConfig), que la reemplaza para pruebas sin AWS/Azure.
 *
 * El nombre exacto del claim de rol dentro del token todavía no está confirmado (custom attribute en
 * Cognito vs. app role en Entra ID) — se resuelve en extraerRol(), es el único lugar que hay que ajustar
 * una vez que se sepa el nombre real. (Mismo criterio que ms-pujas/security/SecurityConfig.java, para que
 * los tres servicios queden consistentes el día que se confirme el claim real.)
 */
@Configuration
@EnableWebSecurity
@Profile("!local")
public class SecurityConfig {

    @Value("${app.security.issuer-uri-cognito:}")
    private String issuerUriCognito;

    @Value("${app.security.issuer-uri-entra:}")
    private String issuerUriEntra;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JsonErrorWriter errorWriter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/health").permitAll()
                        // El preflight CORS del navegador nunca lleva Authorization; el API Gateway
                        // reenvía OPTIONS al backend igual que cualquier otro método (ver ruta
                        // "OPTIONS /{proxy+}" con autorización NONE), así que acá también hay que
                        // dejarlo pasar sin JWT o el preflight muere con 401 antes de la petición real.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .authenticationManagerResolver(issuerAuthenticationManagerResolver())
                        .authenticationEntryPoint((request, response, ex) ->
                                errorWriter.write(response, 401, "NO_AUTENTICADO", "Token ausente o inválido."))
                )
                .exceptionHandling(eh -> eh
                        .accessDeniedHandler((request, response, ex) ->
                                errorWriter.write(response, 403, "PROHIBIDO", "No tienes permiso para esta operación."))
                );
        return http.build();
    }

    private AuthenticationManagerResolver<HttpServletRequest> issuerAuthenticationManagerResolver() {
        Map<String, AuthenticationManager> managersPorIssuer = new HashMap<>();
        if (issuerUriCognito != null && !issuerUriCognito.isBlank()) {
            managersPorIssuer.put(issuerUriCognito, jwtAuthenticationManager(issuerUriCognito));
        }
        if (issuerUriEntra != null && !issuerUriEntra.isBlank()) {
            managersPorIssuer.put(issuerUriEntra, jwtAuthenticationManager(issuerUriEntra));
        }
        return new JwtIssuerAuthenticationManagerResolver(managersPorIssuer::get);
    }

    private AuthenticationManager jwtAuthenticationManager(String issuerUri) {
        JwtDecoder decoder = JwtDecoders.fromIssuerLocation(issuerUri);
        JwtAuthenticationProvider provider = new JwtAuthenticationProvider(decoder);
        provider.setJwtAuthenticationConverter(jwtAuthenticationConverter());
        return provider::authenticate;
    }

    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            String rol = extraerRol(jwt);
            return rol == null ? List.of() : List.of(new SimpleGrantedAuthority("ROLE_" + rol));
        });
        return converter;
    }

    private String extraerRol(Jwt jwt) {
        Object rol = jwt.getClaims().get("custom:rol");
        if (rol == null) {
            rol = jwt.getClaims().get("role");
        }
        if (rol == null) {
            Object roles = jwt.getClaims().get("roles");
            if (roles instanceof List<?> lista && !lista.isEmpty()) {
                rol = lista.get(0);
            }
        }
        return rol == null ? null : rol.toString();
    }
}
