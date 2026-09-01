package com.subastalive.catalogo.pujas;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Optional;
import java.util.UUID;

/**
 * Llama a GET /pujas/{subastaId}/actual en ms-pujas para enriquecer GET /subastas/{id} con el precio
 * vigente — ver ms-catalogo/README.md, sección "Comunicación con otros microservicios".
 *
 * Decisión tomada en el README: si ms-pujas no responde (o no hay pujas todavía), nunca se debe fallar
 * el endpoint completo por un problema del servicio de pujas — por eso este cliente nunca lanza una
 * excepción hacia arriba, devuelve Optional.empty() y quien llama decide el valor por defecto
 * (lote.precioBase / totalPujas = 0).
 */
@Component
public class PujasClient {

    private static final Logger log = LoggerFactory.getLogger(PujasClient.class);

    private final RestClient restClient;

    public PujasClient(@Value("${app.ms-pujas.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public Optional<PrecioActualDto> obtenerActual(UUID subastaId, String authorizationHeader) {
        try {
            PrecioActualDto respuesta = restClient.get()
                    .uri("/pujas/{id}/actual", subastaId)
                    .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                    .retrieve()
                    .body(PrecioActualDto.class);
            return Optional.ofNullable(respuesta);
        } catch (Exception e) {
            log.warn("ms-pujas no respondió al consultar el precio vigente de la subasta {}: {}",
                    subastaId, e.getMessage());
            return Optional.empty();
        }
    }
}
