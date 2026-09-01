package com.subastalive.pujas.catalogo;

import com.subastalive.pujas.error.CatalogoNoDisponibleException;
import com.subastalive.pujas.error.SubastaNoEncontradaException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.UUID;

/**
 * Llama a GET /subastas/{id}/reglas en ms-catalogo antes de aceptar una puja — ver
 * ../ms-catalogo/README.md y ../ms-pujas/README.md, sección "Comunicación con otros microservicios".
 * Se reenvía el JWT original de la petición entrante (Etapa 1 no define aún un mecanismo de
 * autenticación servicio-a-servicio separado).
 */
@Component
public class CatalogoClient {

    private final RestClient restClient;

    public CatalogoClient(@Value("${app.ms-catalogo.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public ReglasSubastaDto obtenerReglas(UUID subastaId, String authorizationHeader) {
        try {
            return restClient.get()
                    .uri("/subastas/{id}/reglas", subastaId)
                    .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                    .retrieve()
                    .body(ReglasSubastaDto.class);
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                throw new SubastaNoEncontradaException(subastaId);
            }
            throw new CatalogoNoDisponibleException(subastaId, e);
        } catch (Exception e) {
            throw new CatalogoNoDisponibleException(subastaId, e);
        }
    }
}
