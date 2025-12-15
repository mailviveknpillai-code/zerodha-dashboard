package com.zerodha.dashboard.web;

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
import com.zerodha.dashboard.model.DerivativeContract;

@ExtendWith(MockitoExtension.class)
class RealDerivativesControllerTest {

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


    @Test
    void shouldUseMockDataWhenEnabled() {
        ReflectionTestUtils.setField(controller, "zerodhaEnabled", false);
        ReflectionTestUtils.setField(controller, "mockDataEnabled", true);
        DerivativesChain chain = new DerivativesChain("NIFTY", BigDecimal.valueOf(25000));
        when(mockDataService.generateMockDerivativesChain()).thenReturn(chain);

        ResponseEntity<?> response = controller.getRealDerivativesChain("NIFTY");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isInstanceOf(DerivativesChain.class);
    }

    @Test
    void shouldReturnEmptyChainWhenNoSourcesAvailable() {
        ReflectionTestUtils.setField(controller, "zerodhaEnabled", false);
        ReflectionTestUtils.setField(controller, "mockDataEnabled", false);

        ResponseEntity<?> response = controller.getRealDerivativesChain("NIFTY");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        DerivativesChain chain = (DerivativesChain) response.getBody();
        assertThat(chain.getDataSource()).isEqualTo("NO_DATA");
    }

    @Test
    void shouldReturnBadRequestForInvalidSegment() {
        ReflectionTestUtils.setField(controller, "zerodhaEnabled", false);

        ResponseEntity<?> response = controller.getRealDerivativesBySegment("INVALID", "NIFTY");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldHandleExceptionFromAdapters() {
        ReflectionTestUtils.setField(controller, "zerodhaEnabled", true);
        when(zerodhaSessionService.hasActiveAccessToken()).thenReturn(true);
        when(zerodhaApiAdapter.getDerivativesChain("NIFTY")).thenThrow(new RuntimeException("boom"));

        ResponseEntity<?> response = controller.getRealDerivativesChain("NIFTY");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @Test
    void getRealDerivativesBySegmentReturnsFutures() {
        ReflectionTestUtils.setField(controller, "zerodhaEnabled", true);
        when(zerodhaSessionService.hasActiveAccessToken()).thenReturn(true);
        DerivativeContract contract = new DerivativeContract();
        contract.setInstrumentType("FUT");
        contract.setSegment("FUTURES");
        DerivativesChain chain = new DerivativesChain("NIFTY", BigDecimal.ONE);
        chain.addFutures(contract);
        when(zerodhaApiAdapter.getDerivativesChain("NIFTY")).thenReturn(Optional.of(chain));

        ResponseEntity<?> response = controller.getRealDerivativesBySegment("FUTURES", "NIFTY");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).asList().isNotEmpty();
    }

    @Test
    void getRealStrikePriceMonitoringReturnsData() {
        ReflectionTestUtils.setField(controller, "zerodhaEnabled", true);
        when(zerodhaSessionService.hasActiveAccessToken()).thenReturn(true);
        DerivativeContract call = new DerivativeContract();
        call.setInstrumentType("CE");
        call.setStrikePrice(BigDecimal.valueOf(25000));
        DerivativesChain chain = new DerivativesChain("NIFTY", BigDecimal.valueOf(25000));
        chain.setDailyStrikePrice(BigDecimal.valueOf(25000));
        chain.addCallOption(call);
        when(zerodhaApiAdapter.getDerivativesChain("NIFTY")).thenReturn(Optional.of(chain));

        ResponseEntity<?> response = controller.getRealStrikePriceMonitoring("NIFTY");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
