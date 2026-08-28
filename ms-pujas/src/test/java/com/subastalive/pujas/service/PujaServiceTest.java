package com.subastalive.pujas.service;

import com.subastalive.pujas.catalogo.CatalogoClient;
import com.subastalive.pujas.catalogo.ReglasSubastaDto;
import com.subastalive.pujas.domain.Puja;
import com.subastalive.pujas.domain.PujaRepository;
import com.subastalive.pujas.error.MontoInsuficienteException;
import com.subastalive.pujas.error.SubastaNoAbiertaException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class PujaServiceTest {

    @Mock
    private PujaRepository repository;

    @Mock
    private CatalogoClient catalogoClient;

    private PujaService service;

    private final UUID subastaId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new PujaService(repository, catalogoClient);
    }

    @Test
    void rechazaLaPujaSiLaSubastaNoEstaAbierta() {
        when(catalogoClient.obtenerReglas(any(), any()))
                .thenReturn(new ReglasSubastaDto(subastaId, "PROGRAMADA", BigDecimal.valueOf(20000), BigDecimal.valueOf(1000)));

        assertThatThrownBy(() -> service.crearPuja(UUID.randomUUID(), subastaId, BigDecimal.valueOf(25000), "Bearer x"))
                .isInstanceOf(SubastaNoAbiertaException.class);
    }

    @Test
    void rechazaLaPujaSiElMontoNoSuperaElMinimo() {
        when(catalogoClient.obtenerReglas(any(), any()))
                .thenReturn(new ReglasSubastaDto(subastaId, "ABIERTA", BigDecimal.valueOf(20000), BigDecimal.valueOf(1000)));
        when(repository.findMontoMaximoBySubastaId(subastaId)).thenReturn(Optional.of(BigDecimal.valueOf(24000)));

        assertThatThrownBy(() -> service.crearPuja(UUID.randomUUID(), subastaId, BigDecimal.valueOf(24500), "Bearer x"))
                .isInstanceOf(MontoInsuficienteException.class)
                .satisfies(ex -> assertThat(((MontoInsuficienteException) ex).getMontoMinimoRequerido())
                        .isEqualByComparingTo(BigDecimal.valueOf(25000)));
    }

    @Test
    void usaElPrecioBaseComoPrecioVigenteCuandoNoHayPujasPrevias() {
        when(catalogoClient.obtenerReglas(any(), any()))
                .thenReturn(new ReglasSubastaDto(subastaId, "ABIERTA", BigDecimal.valueOf(20000), BigDecimal.valueOf(1000)));
        when(repository.findMontoMaximoBySubastaId(subastaId)).thenReturn(Optional.empty());
        when(repository.save(any(Puja.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UUID usuarioSub = UUID.randomUUID();
        Puja resultado = service.crearPuja(usuarioSub, subastaId, BigDecimal.valueOf(21000), "Bearer x");

        assertThat(resultado.getUsuarioSub()).isEqualTo(usuarioSub);
        assertThat(resultado.getMonto()).isEqualByComparingTo(BigDecimal.valueOf(21000));
    }
}
