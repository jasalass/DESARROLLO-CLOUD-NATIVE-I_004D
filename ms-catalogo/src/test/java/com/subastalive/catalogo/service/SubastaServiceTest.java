package com.subastalive.catalogo.service;

import com.subastalive.catalogo.domain.EstadoSubasta;
import com.subastalive.catalogo.domain.Lote;
import com.subastalive.catalogo.domain.Subasta;
import com.subastalive.catalogo.domain.SubastaRepository;
import com.subastalive.catalogo.error.LoteYaEnSubastaException;
import com.subastalive.catalogo.error.TransicionInvalidaException;
import com.subastalive.catalogo.pujas.PujasClient;
import com.subastalive.catalogo.web.dto.CrearSubastaRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class SubastaServiceTest {

    @Mock
    private SubastaRepository subastaRepository;

    @Mock
    private LoteService loteService;

    @Mock
    private PujasClient pujasClient;

    private SubastaService service;

    private final UUID loteId = UUID.randomUUID();
    private final Lote lote = new Lote(loteId, UUID.randomUUID(), "Reloj antiguo", "desc",
            BigDecimal.valueOf(20000), BigDecimal.valueOf(1000), null);

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new SubastaService(subastaRepository, loteService, pujasClient);
    }

    @Test
    void rechazaProgramarUnaSubastaSiElLoteYaTieneUnaActiva() {
        when(loteService.obtener(loteId)).thenReturn(lote);
        when(subastaRepository.existsByLoteIdAndEstadoIn(any(), any())).thenReturn(true);

        Instant apertura = Instant.now().plus(1, ChronoUnit.HOURS);
        Instant cierre = apertura.plus(2, ChronoUnit.HOURS);
        var request = new CrearSubastaRequest(loteId, apertura, cierre);

        assertThatThrownBy(() -> service.crear(request)).isInstanceOf(LoteYaEnSubastaException.class);
    }

    @Test
    void permiteTransicionarDeProgramadaAAbierta() {
        Subasta subasta = new Subasta(UUID.randomUUID(), loteId, EstadoSubasta.PROGRAMADA,
                Instant.now(), Instant.now().plus(1, ChronoUnit.HOURS));
        when(subastaRepository.findById(subasta.getId())).thenReturn(Optional.of(subasta));
        when(subastaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Subasta resultado = service.cambiarEstado(subasta.getId(), EstadoSubasta.ABIERTA);

        assertThat(resultado.getEstado()).isEqualTo(EstadoSubasta.ABIERTA);
    }

    @Test
    void rechazaUnaTransicionQueSaltaEstados() {
        Subasta subasta = new Subasta(UUID.randomUUID(), loteId, EstadoSubasta.PROGRAMADA,
                Instant.now(), Instant.now().plus(1, ChronoUnit.HOURS));
        when(subastaRepository.findById(subasta.getId())).thenReturn(Optional.of(subasta));

        assertThatThrownBy(() -> service.cambiarEstado(subasta.getId(), EstadoSubasta.CERRADA))
                .isInstanceOf(TransicionInvalidaException.class);
    }

    @Test
    void cierraAutomaticamenteLasSubastasVencidas() {
        Subasta vencida = new Subasta(UUID.randomUUID(), loteId, EstadoSubasta.ABIERTA,
                Instant.now().minus(2, ChronoUnit.HOURS), Instant.now().minus(1, ChronoUnit.HOURS));
        when(subastaRepository.findByEstadoAndFechaCierreBefore(any(), any())).thenReturn(List.of(vencida));
        when(subastaRepository.findById(vencida.getId())).thenReturn(Optional.of(vencida));
        when(subastaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<Subasta> cerradas = service.cerrarSubastasVencidas();

        assertThat(cerradas).hasSize(1);
        assertThat(cerradas.get(0).getEstado()).isEqualTo(EstadoSubasta.CERRADA);
    }
}
