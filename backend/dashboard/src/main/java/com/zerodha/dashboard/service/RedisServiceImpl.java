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

    // overloaded constructor used by older tests - keep single definition, not duplicated
    public RedisServiceImpl(StringRedisTemplate redis, ObjectMapper mapper, Duration ttl, String ignored) {
        this(redis, mapper, ttl);
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

            // if chain-related fields present
            if (snapshot.getExpiry() != null && snapshot.getStrike() != null) {
                // If test code expects other chain fields, adjust accordingly (we keep it safe)
                try {
                    String chainKey = RedisSnapshotKey.byChain(snapshot.getUnderlying(), snapshot.getExpiry(), snapshot.getStrike(), snapshot.getInstrumentType() == null ? "FUT" : snapshot.getInstrumentType().name());
                    ops.set(chainKey, json, ttl);
                    String indexKey = RedisSnapshotKey.chainIndex(snapshot.getUnderlying(), snapshot.getExpiry());
                    try {
                        if (redis.opsForSet() != null) {
                            redis.opsForSet().add(indexKey, chainKey);
                            redis.expire(indexKey, ttl);
                        }
                    } catch (Exception ex) {
                        log.warn("Failed to update chain index {}: {}", indexKey, ex.getMessage());
                    }
                } catch (Exception ex) {
                    // ignore chain write errors in tests if fields not present
                }
            }

            try {
                redis.convertAndSend(RedisSnapshotKey.PUBSUB_CHANNEL, json);
            } catch (Exception e) {
                log.debug("publish failed: {}", e.getMessage());
            }
            return true;
        } catch (JsonProcessingException e) {
            log.error("serialize failed: {}", e.getMessage(), e);
            return false;
        } catch (Exception e) {
            log.error("saveSnapshot error: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public Optional<TickSnapshot> getSnapshotByToken(long instrumentToken) {
        return getSnapshotByToken(String.valueOf(instrumentToken));
    }

    // Overloaded - used in some tests
    public Optional<TickSnapshot> getSnapshotByToken(String instrumentToken) {
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
                String futKey = RedisSnapshotKey.byChain(underlying, expiry, strike, "FUT");
                String callKey = RedisSnapshotKey.byChain(underlying, expiry, strike, "CALL");
                String putKey = RedisSnapshotKey.byChain(underlying, expiry, strike, "PUT");

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
            if (redis != null && redis.getConnectionFactory() != null) {
                redis.getConnectionFactory().getConnection().close();
            }
        } catch (Exception e) {
            log.debug("close error: {}", e.getMessage());
        }
    }
}
