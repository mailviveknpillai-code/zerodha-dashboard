package com.zerodha.dashboard.service;

import com.zerodha.dashboard.model.DerivativesChain;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MockDataServiceTest {

    @Test
    void generatesChainWithFuturesAndOptions() {
        MockDataService service = new MockDataService();
        ReflectionTestUtils.setField(service, "spotPrice", BigDecimal.valueOf(25000));
        ReflectionTestUtils.setField(service, "underlying", "NIFTY");

        DerivativesChain chain = service.generateMockDerivativesChain();

        assertThat(chain.getUnderlying()).isEqualTo("NIFTY");
        assertThat(chain.getFutures()).isNotEmpty();
        assertThat(chain.getCallOptions()).isNotEmpty();
        assertThat(chain.getPutOptions()).isNotEmpty();
        assertThat(chain.getTotalContracts()).isGreaterThan(0);
    }
}






