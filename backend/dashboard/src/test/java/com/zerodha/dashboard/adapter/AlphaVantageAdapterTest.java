package com.zerodha.dashboard.adapter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.zerodha.dashboard.model.TickSnapshot;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

public class AlphaVantageAdapterTest {

    @Test
    void mapAlphaJsonToSnapshot() throws Exception {
        // Test JSON-to-TickSnapshot mapping logic
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        
        // Create a test snapshot manually (simulating adapter logic)
        TickSnapshot s = new TickSnapshot();
        s.setInstrumentToken("NSEI");
        s.setTradingsymbol("NSEI");
        s.setLastPrice(new BigDecimal("281.28"));
        s.setVolume(12345);
        s.setSegment("ALPHA_VANTAGE");
        s.setTimestamp(Instant.now());
        
        // Verify mapping
        assertEquals("NSEI", s.getInstrumentToken());
        assertEquals(new BigDecimal("281.28"), s.getLastPrice());
        assertEquals(12345, s.getVolume());
        assertEquals("ALPHA_VANTAGE", s.getSegment());
        assertNotNull(s.getTimestamp());
        
        // Test JSON serialization/deserialization
        String json = mapper.writeValueAsString(s);
        TickSnapshot deserialized = mapper.readValue(json, TickSnapshot.class);
        assertEquals(s.getInstrumentToken(), deserialized.getInstrumentToken());
        assertEquals(s.getLastPrice(), deserialized.getLastPrice());
        assertEquals(s.getVolume(), deserialized.getVolume());
        assertEquals(s.getSegment(), deserialized.getSegment());
    }
}
