package com.subastalive.catalogo.scheduler;

import com.subastalive.catalogo.service.SubastaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Decisión tomada en el README (RF-18): un scheduler interno revisa periódicamente las subastas en
 * estado ABIERTA cuya fechaCierre ya pasó y las transiciona a CERRADA, reusando la misma lógica del
 * PATCH /subastas/{id}/estado. No se expone como job externo — corre dentro de este mismo proceso.
 */
@Component
public class CierreAutomaticoScheduler {

    private static final Logger log = LoggerFactory.getLogger(CierreAutomaticoScheduler.class);

    private final SubastaService service;

    public CierreAutomaticoScheduler(SubastaService service) {
        this.service = service;
    }

    @Scheduled(fixedDelayString = "${app.scheduler.cierre-automatico-intervalo-ms:30000}")
    public void cerrarSubastasVencidas() {
        var cerradas = service.cerrarSubastasVencidas();
        if (!cerradas.isEmpty()) {
            log.info("Cierre automático: {} subasta(s) transicionada(s) a CERRADA.", cerradas.size());
        }
    }
}
