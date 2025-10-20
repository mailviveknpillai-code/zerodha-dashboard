package com.zerodha.dashboard.web;

import com.zerodha.dashboard.adapter.AlphaVantageAdapter;
import com.zerodha.dashboard.model.TickSnapshot;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AlphaDemoController.class)
class AlphaDemoControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AlphaVantageAdapter adapter;

    @Test
    void controllerMapping_and_decoding() throws Exception {
        TickSnapshot s = new TickSnapshot();
        s.setInstrumentToken("^NSEI");
        s.setTradingsymbol("^NSEI");
        s.setLastPrice(new BigDecimal("100"));
        s.setVolume(1);
        s.setSegment("ALPHA_VANTAGE");
        s.setTimestamp(Instant.now());
        when(adapter.getQuote(anyString())).thenReturn(Optional.of(s));
        mockMvc.perform(get("/api/alpha-demo").param("symbol", "%5ENSEI"))
                .andExpect(status().isOk());
    }
}
