package com.zerodha.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zerodha.dashboard.model.TickSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public class RedisServiceImpl implements RedisService {
    private static final Logger log = LoggerFactory.getLogger(RedisServiceImpl.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final Duration ttl;

    public RedisServiceImpl(StringRedisTemplate redis, ObjectMapper mapper, Duration ttl) {
        this.redis = redis;
        this.mapper = mapper;
        this.ttl = ttl;
    }

    @Override
    public boolean saveSnapshot(TickSnapshot snapshot) {
        if (snapshot == null) return false;
        try {
            String json = mapper.writeValueAsString(snapshot);
            ValueOperations<String, String> ops = redis.opsForValue();

            if (snapshot.getInstrumentToken() != null) {
                String tokenKey = RedisSnapshotKey.byToken(snapshot.getInstrumentToken());
                ops.set(tokenKey, json, ttl);
            }

            if (snapshot.getExpiry() != null && snapshot.getStrike() != null
                    && snapshot.getInstrumentType() != null && snapshot.getUnderlying() != null) {

                String chainKey = RedisSnapshotKey.byChain(snapshot.getUnderlying(), snapshot.getExpiry(), snapshot.getStrike(), snapshot.getInstrumentType().name());
                ops.set(chainKey, json, ttl);

                String indexKey = RedisSnapshotKey.chainIndex(snapshot.getUnderlying(), snapshot.getExpiry());
                redis.opsForSet().add(indexKey, chainKey);
                redis.expire(indexKey, ttl);
            }

            // publish update
            redis.convertAndSend(RedisSnapshotKey.PUBSUB_CHANNEL, json);
            return true;
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize snapshot: {}", e.getMessage(), e);
            return false;
        } catch (Exception e) {
            log.error("Redis saveSnapshot error: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public Optional<TickSnapshot> getSnapshotByToken(long instrumentToken) {
        try {
            String json = redis.opsForValue().get(RedisSnapshotKey.byToken(instrumentToken));
            if (json == null) return Optional.empty();
            TickSnapshot s = mapper.readValue(json, TickSnapshot.class);
            return Optional.ofNullable(s);
        } catch (Exception e) {
            log.warn("getSnapshotByToken failed for {} : {}", instrumentToken, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public List<TickSnapshot> getSnapshotsForChain(String underlying, String expiry, int centerStrike, int range, int step) {
        List<TickSnapshot> out = new ArrayList<>();
        try {
            for (int i = -range; i <= range; i++) {
                int strike = centerStrike + i * step;
                String futKey = RedisSnapshotKey.byChain(underlying, expiry, strike, TickSnapshot.InstrumentType.FUT.name());
                String callKey = RedisSnapshotKey.byChain(underlying, expiry, strike, TickSnapshot.InstrumentType.CALL.name());
                String putKey = RedisSnapshotKey.byChain(underlying, expiry, strike, TickSnapshot.InstrumentType.PUT.name());

                TickSnapshot fut = readIfExists(futKey);
                TickSnapshot call = readIfExists(callKey);
                TickSnapshot put = readIfExists(putKey);

                if (fut != null) out.add(fut);
                if (call != null) out.add(call);
                if (put != null) out.add(put);
            }
        } catch (Exception e) {
            log.warn("getSnapshotsForChain error: {}", e.getMessage());
        }
        return out;
    }

    @Override
    public List<TickSnapshot> getAllSnapshotsForExpiry(String underlying, String expiry) {
        List<TickSnapshot> out = new ArrayList<>();
        try {
            String indexKey = RedisSnapshotKey.chainIndex(underlying, expiry);
            Set<String> keys = redis.opsForSet().members(indexKey);
            if (keys == null || keys.isEmpty()) return out;
            List<String> values = redis.opsForValue().multiGet(keys);
            if (values != null) {
                for (String v : values) {
                    if (v == null) continue;
                    try {
                        out.add(mapper.readValue(v, TickSnapshot.class));
                    } catch (Exception ex) {
                        log.debug("Skipping invalid JSON in index: {}", ex.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("getAllSnapshotsForExpiry error: {}", e.getMessage());
        }
        return out;
    }

    @Override
    public void publishSnapshot(TickSnapshot snapshot) {
        try {
            String json = mapper.writeValueAsString(snapshot);
            redis.convertAndSend(RedisSnapshotKey.PUBSUB_CHANNEL, json);
        } catch (JsonProcessingException e) {
            log.warn("publishSnapshot serialization failed: {}", e.getMessage());
        } catch (Exception e) {
            log.warn("publishSnapshot error: {}", e.getMessage());
        }
    }

    private TickSnapshot readIfExists(String key) {
        try {
            String json = redis.opsForValue().get(key);
            if (json == null) return null;
            return mapper.readValue(json, TickSnapshot.class);
        } catch (Exception e) {
            log.debug("readIfExists failed for key {}: {}", key, e.getMessage());
            return null;
        }
    }

    @Override
    public void close() {
        try {
            redis.getConnectionFactory().getConnection().close();
        } catch (Exception e) {
            log.debug("close error: {}", e.getMessage());
        }
    }
}
