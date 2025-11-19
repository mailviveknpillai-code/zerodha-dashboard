package com.zerodha.dashboard.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ZerodhaSessionServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private HashOperations<String, Object, Object> hashOperations;

    private ZerodhaSessionService service;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForHash()).thenReturn(hashOperations);
        service = new ZerodhaSessionService(redisTemplate);
    }

    @SuppressWarnings("unchecked")
    @Test
    void saveSessionPersistsAndSetsTtl() {
        service.saveSession(Map.of("access_token", "tk"));

        ArgumentCaptor<Map<String, String>> captor = ArgumentCaptor.forClass(Map.class);
        verify(hashOperations).putAll(eq("zerodha:session"), captor.capture());
        assertThat(captor.getValue()).containsKey("updated_at");
        verify(redisTemplate).expire("zerodha:session", Duration.ofHours(24));
    }

    @Test
    void saveSessionIgnoresEmptyPayload() {
        service.saveSession(Map.of());
        verify(hashOperations, never()).putAll(anyString(), anyMap());
    }

    @Test
    void saveSessionIgnoresNullPayload() {
        service.saveSession(null);
        verify(hashOperations, never()).putAll(anyString(), anyMap());
    }

    @Test
    void getAccessTokenReturnsFallbackWhenRedisMissing() {
        ReflectionTestUtils.setField(service, "fallbackAccessToken", "fallback");
        when(hashOperations.get("zerodha:session", "access_token")).thenReturn(null);

        assertThat(service.getAccessToken()).contains("fallback");
    }

    @Test
    void getAccessTokenReadsFromRedis() {
        when(hashOperations.get("zerodha:session", "access_token")).thenReturn("redis-token");

        assertThat(service.getAccessToken()).contains("redis-token");
        assertThat(service.hasActiveAccessToken()).isTrue();
    }

    @Test
    void clearSessionDeletesKeyEvenOnError() {
        service.clearSession();
        verify(redisTemplate).delete("zerodha:session");

        doThrow(new RuntimeException("boom")).when(redisTemplate).delete("zerodha:session");
        service.clearSession();
    }

    @Test
    void getSessionSnapshotReturnsNormalizedMap() {
        when(hashOperations.entries("zerodha:session")).thenReturn(Map.of("access_token", "abc"));

        Map<String, String> snapshot = service.getSessionSnapshot();
        assertThat(snapshot).containsEntry("access_token", "abc");
    }

    @Test
    void getSessionSnapshotReturnsEmptyWhenNoEntries() {
        when(hashOperations.entries("zerodha:session")).thenReturn(Collections.emptyMap());
        assertThat(service.getSessionSnapshot()).isEmpty();
    }
}
