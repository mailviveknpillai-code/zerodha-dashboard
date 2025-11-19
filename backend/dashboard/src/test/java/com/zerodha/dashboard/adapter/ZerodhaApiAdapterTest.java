package com.zerodha.dashboard.adapter;

import com.zerodha.dashboard.service.ZerodhaSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ZerodhaApiAdapterTest {

    @Mock
    private ZerodhaSessionService zerodhaSessionService;

    private ZerodhaApiAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new ZerodhaApiAdapter(zerodhaSessionService);
        ReflectionTestUtils.setField(adapter, "apiKey", "test-key");
    }

    @Test
    void shouldReturnEmptyWhenZerodhaDisabled() {
        ReflectionTestUtils.setField(adapter, "zerodhaEnabled", false);

        Optional<BigDecimal> spotPrice = adapter.getSpotPrice("NIFTY");
        assertThat(spotPrice).isEmpty();

        Optional<?> chain = adapter.getDerivativesChain("NIFTY");
        assertThat(chain).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenAccessTokenMissing() {
        ReflectionTestUtils.setField(adapter, "zerodhaEnabled", true);
        when(zerodhaSessionService.getAccessToken()).thenReturn(Optional.empty());

        Optional<BigDecimal> spotPrice = adapter.getSpotPrice("NIFTY");
        assertThat(spotPrice).isEmpty();
    }
}
