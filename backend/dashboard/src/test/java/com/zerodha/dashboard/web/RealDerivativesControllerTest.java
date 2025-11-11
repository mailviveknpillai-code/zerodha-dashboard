package com.zerodha.dashboard.web;

import com.zerodha.dashboard.adapter.BreezeApiAdapter;
import com.zerodha.dashboard.adapter.ZerodhaApiAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.service.MockDataService;
import com.zerodha.dashboard.service.ZerodhaSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RealDerivativesControllerTest {

    @Mock
    private BreezeApiAdapter breezeApiAdapter;

    @Mock
    private ZerodhaApiAdapter zerodhaApiAdapter;

    @Mock
    private MockDataService mockDataService;

    @Mock
    private ZerodhaSessionService zerodhaSessionService;

    @InjectMocks
    private RealDerivativesController controller;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(controller, "breezeApiEnabled", false);
        ReflectionTestUtils.setField(controller, "zerodhaEnabled", true);
        ReflectionTestUtils.setField(controller, "mockDataEnabled", false);
    }

    @Test
    void shouldReturnBadRequestWhenUnderlyingMissing() {
        ResponseEntity<?> response = controller.getRealDerivativesChain(" ");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldReturnUnauthorizedWhenZerodhaSessionMissing() {
        when(zerodhaSessionService.hasActiveAccessToken()).thenReturn(false);

        ResponseEntity<?> response = controller.getRealDerivativesChain("NIFTY");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isInstanceOfAny(java.util.Map.class);
    }

    @Test
    void shouldReturnDerivativesChainWhenZerodhaProvidesData() {
        DerivativesChain chain = new DerivativesChain("NIFTY", new BigDecimal("25000"));
        chain.setTimestamp(Instant.now());
        when(zerodhaSessionService.hasActiveAccessToken()).thenReturn(true);
        when(zerodhaApiAdapter.getDerivativesChain("NIFTY")).thenReturn(Optional.of(chain));

        ResponseEntity<?> response = controller.getRealDerivativesChain("NIFTY");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(DerivativesChain.class);
    }
}
