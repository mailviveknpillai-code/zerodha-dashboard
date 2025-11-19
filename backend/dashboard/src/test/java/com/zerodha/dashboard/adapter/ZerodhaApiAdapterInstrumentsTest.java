package com.zerodha.dashboard.adapter;

import com.zerodha.dashboard.model.DerivativesChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class ZerodhaApiAdapterInstrumentsTest {

    @Mock
    private com.zerodha.dashboard.service.ZerodhaSessionService sessionService;

    private ZerodhaApiAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new ZerodhaApiAdapter(sessionService);
        ReflectionTestUtils.setField(adapter, "zerodhaEnabled", true);
        ReflectionTestUtils.setField(adapter, "apiKey", "key");
    }

    @Test
    void parseInstrumentsCsv_handlesQuotedNamesAndNumericFields() {
        String csv = "instrument_token,exchange_token,tradingsymbol,name,last_price,expiry,strike,tick_size,lot_size,instrument_type,segment,exchange\n" +
                "123,1,NIFTY24DECFUT,\"NIFTY 50\",100,2024-12-26,,0.05,50,FUT,NFO-FO,NFO";

        @SuppressWarnings("unchecked")
        List<ZerodhaInstrument> instruments = ReflectionTestUtils.invokeMethod(adapter, "parseInstrumentsCsv", csv);

        assertThat(instruments).hasSize(1);
        ZerodhaInstrument instrument = instruments.get(0);
        assertThat(instrument.getTradingsymbol()).isEqualTo("NIFTY24DECFUT");
        assertThat(instrument.getName()).isEqualTo("NIFTY 50");
        assertThat(instrument.getExpiry()).isEqualTo(LocalDate.of(2024, 12, 26));
        assertThat(instrument.getLotSize()).isEqualTo(50);
    }

    @Test
    void getCurrentMonthExpiry_calculatesLastThursday() {
        LocalDate date = LocalDate.of(2024, 4, 10);
        LocalDate expiry = ReflectionTestUtils.invokeMethod(adapter, "getCurrentMonthExpiry", date);
        assertThat(expiry.getDayOfWeek().getValue()).isEqualTo(4);
        assertThat(expiry.getMonthValue()).isEqualTo(4);
    }

    @Test
    void getNiftyFuturesInstruments_filtersByExpiryAndType() {
        List<ZerodhaInstrument> cache = new ArrayList<>();
        cache.add(buildInstrument("NIFTY24APR7500FUT", "FUT", LocalDate.now().plusDays(10), 7500));
        cache.add(buildInstrument("NIFTYBANK24APR7500FUT", "FUT", LocalDate.now().plusDays(10), 7500));
        cache.add(buildInstrument("NIFTY24APR7500CE", "CE", LocalDate.now().plusDays(10), 7500));

        ReflectionTestUtils.setField(adapter, "cachedInstruments", cache);
        ReflectionTestUtils.setField(adapter, "instrumentsCacheDate", LocalDate.now());

        @SuppressWarnings("unchecked")
        List<ZerodhaInstrument> result = ReflectionTestUtils.invokeMethod(adapter, "getNiftyFuturesInstruments", "NIFTY", "token");

        assertThat(result)
                .hasSize(2)
                .allMatch(inst -> inst.getTradingsymbol().startsWith("NIFTY"))
                .extracting(ZerodhaInstrument::getInstrumentType)
                .containsOnly("FUT");
    }

    @Test
    void getNiftyOptionInstruments_selectsNearestExpiryAndReferenceRange() {
        LocalDate today = LocalDate.now();
        LocalDate thisThursday = today.plusDays(Math.max(1, 4 - today.getDayOfWeek().getValue()));

        List<ZerodhaInstrument> cache = new ArrayList<>();
        cache.add(buildOption("NIFTY24APR24000CE", "CE", thisThursday, 24000));
        cache.add(buildOption("NIFTY24APR24050CE", "CE", thisThursday, 24050));
        cache.add(buildOption("NIFTY24APR23950PE", "PE", thisThursday, 23950));
        cache.add(buildOption("NIFTY24MAY25000CE", "CE", thisThursday.plusWeeks(1), 25000));

        ReflectionTestUtils.setField(adapter, "cachedInstruments", cache);
        ReflectionTestUtils.setField(adapter, "instrumentsCacheDate", LocalDate.now());

        @SuppressWarnings("unchecked")
        List<ZerodhaInstrument> result = ReflectionTestUtils.invokeMethod(
                adapter,
                "getNiftyOptionInstruments",
                "NIFTY",
                BigDecimal.valueOf(24025),
                "token"
        );

        assertThat(result)
                .isNotEmpty()
                .allMatch(inst -> inst.getExpiry().equals(thisThursday))
                .anyMatch(inst -> inst.getTradingsymbol().equals("NIFTY24APR24000CE"));
    }

    @Test
    void fetchFuturesData_populatesChainFromCachedInstruments() {
        List<ZerodhaInstrument> cache = new ArrayList<>();
        cache.add(buildInstrument("NIFTY24APR7500FUT", "FUT", LocalDate.now().plusDays(5), 7500));

        ReflectionTestUtils.setField(adapter, "cachedInstruments", cache);
        ReflectionTestUtils.setField(adapter, "instrumentsCacheDate", LocalDate.now());

        DerivativesChain chain = new DerivativesChain("NIFTY", BigDecimal.valueOf(25000));
        ReflectionTestUtils.invokeMethod(adapter, "parseFuturesQuotes", "{\"data\":{}}", cache, chain);

        assertThat(chain.getFutures()).isEmpty();
    }

    private ZerodhaInstrument buildInstrument(String symbol, String type, LocalDate expiry, double strike) {
        ZerodhaInstrument instrument = new ZerodhaInstrument();
        instrument.setInstrumentToken(symbol.hashCode());
        instrument.setTradingsymbol(symbol);
        instrument.setInstrumentType(type);
        instrument.setExpiry(expiry);
        instrument.setStrike(strike);
        instrument.setExchange("NFO");
        instrument.setSegment("NFO-FO");
        instrument.setLotSize(50);
        instrument.setTickSize(0.05);
        return instrument;
    }

    private ZerodhaInstrument buildOption(String symbol, String type, LocalDate expiry, double strike) {
        ZerodhaInstrument instrument = buildInstrument(symbol, type, expiry, strike);
        instrument.setInstrumentType(type);
        return instrument;
    }
}
