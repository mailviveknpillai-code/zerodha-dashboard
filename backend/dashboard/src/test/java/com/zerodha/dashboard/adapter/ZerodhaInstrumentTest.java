package com.zerodha.dashboard.adapter;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ZerodhaInstrumentTest {

    @Test
    void settersPopulateFields() {
        ZerodhaInstrument instrument = new ZerodhaInstrument();
        instrument.setInstrumentToken(1L);
        instrument.setExchangeToken(2L);
        instrument.setTradingsymbol("NIFTY24APR24000CE");
        instrument.setName("NIFTY 50");
        instrument.setLastPrice(100.5);
        instrument.setExpiry(LocalDate.now());
        instrument.setStrike(24500);
        instrument.setTickSize(0.05);
        instrument.setLotSize(50);
        instrument.setInstrumentType("CE");
        instrument.setSegment("NFO-FO");
        instrument.setExchange("NFO");

        assertThat(instrument.getTradingsymbol()).isEqualTo("NIFTY24APR24000CE");
        assertThat(instrument.getInstrumentType()).isEqualTo("CE");
        assertThat(instrument.toString()).contains("NIFTY24APR24000CE");
    }
}













