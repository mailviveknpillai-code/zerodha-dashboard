package com.zerodha.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zerodha.dashboard.model.TickSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

@Service
public class RedisServiceImpl implements RedisService {

    private static final Logger log = LoggerFactory.getLogger(RedisServiceImpl.class);
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Duration expiryDuration;
    private final String redisNamespace;

    public RedisServiceImpl(StringRedisTemplate redisTemplate, ObjectMapper objectMapper, Duration expiryDuration, String redisNamespace) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.expiryDuration = expiryDuration;
        this.redisNamespace = redisNamespace;
    }

    @Override
    public boolean saveSnapshot(TickSnapshot snapshot) {
        if (snapshot == null || snapshot.getInstrumentToken() == null) {
            log.warn("saveSnapshot called with null snapshot or instrumentToken");
            return false;
        }
        String tokenKey = RedisSnapshotKey.byToken(snapshot.getInstrumentToken(), redisNamespace);
        log.debug("Saving snapshot for instrumentToken={}", snapshot.getInstrumentToken());
        try {
            String snapshotJson = objectMapper.writeValueAsString(snapshot);
            redisTemplate.opsForValue().set(tokenKey, snapshotJson, expiryDuration);
            log.info("Saved snapshot for key={}", tokenKey);
            return true;
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize TickSnapshot for token={}", snapshot.getInstrumentToken(), e);
            return false;
        } catch (Exception e) {
            log.error("Redis saveSnapshot error for token={}", snapshot.getInstrumentToken(), e);
            return false;
        }
    }

    @Override
    public Optional<TickSnapshot> getSnapshotByToken(String instrumentToken) {
        if (instrumentToken == null) {
            log.warn("getSnapshotByToken called with null instrumentToken");
            return Optional.empty();
        }
        String tokenKey = RedisSnapshotKey.byToken(instrumentToken, redisNamespace);
        log.debug("Fetching snapshot for instrumentToken={}", instrumentToken);
        String snapshotJson = redisTemplate.opsForValue().get(tokenKey);
        if (snapshotJson != null) {
            log.info("Cache hit for key={}", tokenKey);
            try {
                return Optional.of(objectMapper.readValue(snapshotJson, TickSnapshot.class));
            } catch (JsonProcessingException e) {
                log.error("Failed to deserialize TickSnapshot for key={}", tokenKey, e);
                return Optional.empty();
            }
        } else {
            log.info("Cache miss for key={}", tokenKey);
            return Optional.empty();
        }
    }

    @Override
    public void expireKey(String key, Duration duration) {
        redisTemplate.expire(key, duration);
        log.debug("Expired key={}", key);
    }

    // Added for graceful shutdown, although Spring usually manages connections
    public void close() {
        if (redisTemplate != null && redisTemplate.getConnectionFactory() != null) {
            try {
                ((LettuceConnectionFactory) redisTemplate.getConnectionFactory()).destroy();
                log.info("Redis connection factory destroyed.");
            } catch (Exception e) {
                log.error("Error closing Redis connection factory", e);
            }
        }
    }
}
