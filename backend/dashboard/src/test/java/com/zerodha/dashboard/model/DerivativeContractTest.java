package com.zerodha.dashboard.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DerivativeContractTest {

    @Test
    void constructorInitializesFields() {
        LocalDate expiry = LocalDate.of(2025, 12, 25);
        DerivativeContract contract = new DerivativeContract("1", "NIFTY", "NIFTY", "FUTURES", "FUT", expiry, BigDecimal.ZERO, BigDecimal.TEN);

        assertThat(contract.getInstrumentToken()).isEqualTo("1");
        assertThat(contract.getExpiryDate()).isEqualTo(expiry);
        assertThat(contract.getTimestamp()).isNotNull();
    }

    @Test
    void settersAndGettersWork() {
        DerivativeContract contract = new DerivativeContract();
        Instant ts = Instant.now();

        contract.setInstrumentToken("2");
        contract.setTradingsymbol("SYMBOL");
        contract.setUnderlying("NIFTY");
        contract.setSegment("CALL_OPTIONS");
        contract.setInstrumentType("CE");
        contract.setExpiryDate(LocalDate.of(2025, 6, 12));
        contract.setStrikePrice(BigDecimal.valueOf(24000));
        contract.setLastPrice(BigDecimal.valueOf(123.45));
        contract.setOpenInterest(BigDecimal.valueOf(1000));
        contract.setChange(BigDecimal.ONE);
        contract.setChangePercent(BigDecimal.TEN);
        contract.setVolume(1234);
        contract.setBid(BigDecimal.valueOf(100));
        contract.setAsk(BigDecimal.valueOf(110));
        contract.setHigh(BigDecimal.valueOf(130));
        contract.setLow(BigDecimal.valueOf(90));
        contract.setOpen(BigDecimal.valueOf(95));
        contract.setClose(BigDecimal.valueOf(105));
        contract.setTotalTradedValue(9999);
        contract.setLotSize(50);
        contract.setTickSize(BigDecimal.valueOf(0.05));
        contract.setBidQuantity(5L);
        contract.setAskQuantity(6L);
        contract.setTimestamp(ts);

        assertThat(contract.getInstrumentToken()).isEqualTo("2");
        assertThat(contract.getTradingsymbol()).isEqualTo("SYMBOL");
        assertThat(contract.getSegment()).isEqualTo("CALL_OPTIONS");
        assertThat(contract.getLotSize()).isEqualTo(50);
        assertThat(contract.getAskQuantity()).isEqualTo(6L);
        assertThat(contract.getTimestamp()).isEqualTo(ts);
        assertThat(contract.toString()).contains("SYMBOL");
    }
}






