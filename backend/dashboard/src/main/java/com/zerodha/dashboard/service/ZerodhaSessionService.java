package com.zerodha.dashboard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Central place to manage Zerodha session state (access token, metadata).
 * Tokens are persisted in Redis so users don't have to update configuration files daily.
 */
@Service
public class ZerodhaSessionService {

    private static final Logger log = LoggerFactory.getLogger(ZerodhaSessionService.class);

    private static final String SESSION_KEY = "zerodha:session";
    private static final String ACCESS_TOKEN_FIELD = "access_token";
    private static final String UPDATED_AT_FIELD = "updated_at";

    private final StringRedisTemplate redisTemplate;

    @Value("${zerodha.access.token:}")
    private String fallbackAccessToken;

    public ZerodhaSessionService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Store the current session details in Redis.
     */
    public void saveSession(Map<String, String> sessionData) {
        if (sessionData == null || sessionData.isEmpty()) {
            log.warn("Attempted to save empty Zerodha session data");
            return;
        }

        Map<String, String> payload = new HashMap<>(sessionData);
        payload.put(UPDATED_AT_FIELD, Instant.now().toString());

        try {
            redisTemplate.opsForHash().putAll(SESSION_KEY, payload);
            // Zerodha tokens expire daily; auto-expire after 24 hours to avoid stale entries.
            redisTemplate.expire(SESSION_KEY, Duration.ofHours(24));
            log.info("Persisted Zerodha session details in Redis (fields: {})", payload.keySet());
        } catch (Exception ex) {
            log.error("Failed to persist Zerodha session in Redis: {}", ex.getMessage(), ex);
        }
    }

    /**
     * Returns the active access token, checking Redis first and falling back to the optional property.
     */
    public Optional<String> getAccessToken() {
        String token = null;
        try {
            Object value = redisTemplate.opsForHash().get(SESSION_KEY, ACCESS_TOKEN_FIELD);
            if (value instanceof String) {
                token = (String) value;
            }
        } catch (Exception ex) {
            log.error("Failed to read Zerodha access token from Redis: {}", ex.getMessage(), ex);
        }

        if (!StringUtils.hasText(token)) {
            return Optional.ofNullable(fallbackAccessToken).filter(StringUtils::hasText);
        }
        return Optional.of(token);
    }

    /**
     * Indicates whether a usable access token is currently available.
     */
    public boolean hasActiveAccessToken() {
        return getAccessToken().filter(StringUtils::hasText).isPresent();
    }

    /**
     * Clears the cached session (used when Zerodha returns auth errors).
     */
    public void clearSession() {
        try {
            redisTemplate.delete(SESSION_KEY);
            log.info("Cleared Zerodha session cache from Redis");
        } catch (Exception ex) {
            log.error("Failed to clear Zerodha session cache: {}", ex.getMessage(), ex);
        }
    }

    /**
     * Returns the raw session snapshot for diagnostics.
     */
    public Map<String, String> getSessionSnapshot() {
        try {
            Map<Object, Object> entries = redisTemplate.opsForHash().entries(SESSION_KEY);
            if (entries == null || entries.isEmpty()) {
                return Collections.emptyMap();
            }

            Map<String, String> normalized = new HashMap<>();
            entries.forEach((key, value) -> {
                if (key != null && value != null) {
                    normalized.put(key.toString(), value.toString());
                }
            });
            return normalized;
        } catch (Exception ex) {
            log.error("Failed to read Zerodha session snapshot: {}", ex.getMessage(), ex);
            return Collections.emptyMap();
        }
    }
}


