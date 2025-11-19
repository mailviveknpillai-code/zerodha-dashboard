package com.zerodha.dashboard.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DerivativesChainTest {

    @Test
    void totalsAndAddersWork() {
        DerivativesChain chain = new DerivativesChain("NIFTY", BigDecimal.valueOf(25000));
        DerivativeContract future = new DerivativeContract();
        future.setSegment("FUTURES");
        chain.addFutures(future);
        chain.addCallOption(new DerivativeContract());
        chain.addPutOption(new DerivativeContract());

        assertThat(chain.getTotalContracts()).isEqualTo(3);
        assertThat(chain.toString()).contains("NIFTY");
    }

    @Test
    void strikeFiltersReturnExpectedContracts() {
        DerivativesChain chain = new DerivativesChain();
        chain.setDailyStrikePrice(BigDecimal.valueOf(25000));

        DerivativeContract callWithin = new DerivativeContract();
        callWithin.setStrikePrice(BigDecimal.valueOf(25050));
        chain.addCallOption(callWithin);

        DerivativeContract putBelow = new DerivativeContract();
        putBelow.setStrikePrice(BigDecimal.valueOf(24900));
        chain.addPutOption(putBelow);

        DerivativeContract callAbove = new DerivativeContract();
        callAbove.setStrikePrice(BigDecimal.valueOf(25200));
        chain.addCallOption(callAbove);

        List<DerivativeContract> monitoring = chain.getStrikePriceMonitoring();
        assertThat(monitoring).contains(callWithin);

        List<DerivativeContract> above = chain.getAboveStrikePrice();
        assertThat(above).contains(callAbove);

        List<DerivativeContract> below = chain.getBelowStrikePrice();
        assertThat(below).contains(putBelow);
    }

    @Test
    void strikeHelpersReturnEmptyWhenDailyStrikeMissing() {
        DerivativesChain chain = new DerivativesChain();
        chain.addCallOption(new DerivativeContract());
        chain.addPutOption(new DerivativeContract());

        assertThat(chain.getStrikePriceMonitoring()).isEmpty();
        assertThat(chain.getAboveStrikePrice()).isEmpty();
        assertThat(chain.getBelowStrikePrice()).isEmpty();
    }
}
