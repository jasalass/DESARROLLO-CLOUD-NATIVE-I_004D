package com.subastalive.catalogo.security;

import com.subastalive.catalogo.web.JsonErrorWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Seguridad simplificada para el perfil "local" (docker-compose de desarrollo). Reemplaza la validación
 * real de JWT (que requiere un Cognito/Entra ID real) por LocalTokenAuthFilter, para poder levantar y
 * probar toda la aplicación — frontend incluido, en su modo mock — sin depender de AWS/Azure.
 *
 * No se activa en ningún otro perfil: ver SecurityConfig para la validación real (RF-29, RF-33).
 */
@Configuration
@EnableWebSecurity
@Profile("local")
public class LocalSecurityConfig {

    @Bean
    SecurityFilterChain localFilterChain(HttpSecurity http, JsonErrorWriter errorWriter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/health").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(new LocalTokenAuthFilter(), UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint((request, response, ex) ->
                                errorWriter.write(response, 401, "NO_AUTENTICADO", "Token ausente o inválido."))
                        .accessDeniedHandler((request, response, ex) ->
                                errorWriter.write(response, 403, "PROHIBIDO", "No tienes permiso para esta operación."))
                );
        return http.build();
    }
}
