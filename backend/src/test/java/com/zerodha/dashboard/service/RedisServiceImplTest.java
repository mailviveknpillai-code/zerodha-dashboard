package com.zerodha.dashboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zerodha.dashboard.model.TickSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RedisServiceImplTest {

    private StringRedisTemplate redis;
    private ValueOperations<String, String> ops;
    private ObjectMapper mapper;
    private RedisServiceImpl service;

    @BeforeEach
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        mapper = new ObjectMapper();
        service = new RedisServiceImpl(redis, mapper, Duration.ofSeconds(300), "snapshot:pubsub");
    }

    @Test
    void saveSnapshot_tokenOnly() throws Exception {
        TickSnapshot snap = new TickSnapshot();
        snap.setInstrumentToken("NIFTY:25APR:25000:CE");
        snap.setUnderlying("NIFTY");
        snap.setExpiry("25APR");
        snap.setStrike("25000");
        snap.setSegment("Call ATM (25000)");

        when(ops.get(anyString())).thenReturn(null);

        boolean ok = service.saveSnapshot(snap);
        assertTrue(ok);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(ops, atLeastOnce()).set(keyCaptor.capture(), anyString(), any());
        assertTrue(keyCaptor.getAllValues().stream().anyMatch(k -> k.contains("snapshot:token:")));
    }

    @Test
    void getSnapshotByToken_returnsSnapshot() throws Exception {
        TickSnapshot s = new TickSnapshot();
        s.setInstrumentToken("NIFTY:25APR:25000:CE");
        String json = mapper.writeValueAsString(s);
        when(ops.get(anyString())).thenReturn(json);

        Optional<TickSnapshot> out = service.getSnapshotByToken("NIFTY:25APR:25000:CE");
        assertTrue(out.isPresent());
        assertEquals("NIFTY:25APR:25000:CE", out.get().getInstrumentToken());
    }
}
