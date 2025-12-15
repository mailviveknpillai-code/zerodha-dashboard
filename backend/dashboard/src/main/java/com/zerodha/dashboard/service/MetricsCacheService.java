package com.zerodha.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zerodha.dashboard.model.MetricResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Service for storing and retrieving windowed metric results in Redis.
 * Uses atomic writes with version tracking to ensure consistency.
 * 
 * Redis Schema:
 * - latest:{symbol} → Redis hash with fields: trendScore, ltpMovement, bidAskEaten, spotLtpMovement
 * - Each field value is a JSON string containing MetricResult
 * - version:{symbol}:{feature} → Redis string containing the current version number
 */
@Service
public class MetricsCacheService {
    
    private static final Logger log = LoggerFactory.getLogger(MetricsCacheService.class);
    private static final String KEY_PREFIX_LATEST = "latest:";
    private static final String KEY_PREFIX_VERSION = "version:";
    private static final Duration DEFAULT_TTL = Duration.ofHours(24);
    
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    
    // Lua script for atomic write with version increment
    private static final String ATOMIC_WRITE_SCRIPT = 
        "local hashKey = KEYS[1]\n" +
        "local versionKey = KEYS[2]\n" +
        "local field = ARGV[1]\n" +
        "local valueJson = ARGV[2]\n" +
        "local expectedVersion = tonumber(ARGV[3])\n" +
        "\n" +
        "local currentVersion = tonumber(redis.call('GET', versionKey) or '0')\n" +
        "if expectedVersion and expectedVersion > 0 and currentVersion ~= expectedVersion then\n" +
        "  return {err = 'VERSION_MISMATCH', current = currentVersion, expected = expectedVersion}\n" +
        "end\n" +
        "\n" +
        "local newVersion = currentVersion + 1\n" +
        "redis.call('HSET', hashKey, field, valueJson)\n" +
        "redis.call('SET', versionKey, newVersion)\n" +
        "redis.call('EXPIRE', hashKey, 86400)\n" +
        "redis.call('EXPIRE', versionKey, 86400)\n" +
        "\n" +
        "return {ok = true, version = newVersion}\n";
    
    @SuppressWarnings("rawtypes")
    private final DefaultRedisScript<Map> atomicWriteScript;
    
    public MetricsCacheService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        @SuppressWarnings("rawtypes")
        DefaultRedisScript<Map> script = new DefaultRedisScript<>();
        script.setScriptText(ATOMIC_WRITE_SCRIPT);
        script.setResultType(Map.class);
        this.atomicWriteScript = script;
    }
    
    /**
     * Store a final metric result atomically with version increment.
     * 
     * @param result The metric result to store
     * @return The new version number, or null if write failed
     */
    public Long storeFinalResult(MetricResult result) {
        if (result == null || result.getSymbol() == null || result.getFeature() == null) {
            log.warn("storeFinalResult called with invalid result: {}", result);
            return null;
        }
        
        try {
            String symbol = result.getSymbol();
            String feature = result.getFeature();
            
            // Ensure status is "final"
            result.setStatus("final");
            
            // Set computedAt if not already set
            if (result.getComputedAt() == null) {
                result.setComputedAt(Instant.now());
            }
            
            String hashKey = KEY_PREFIX_LATEST + symbol;
            String versionKey = KEY_PREFIX_VERSION + symbol + ":" + feature;
            String valueJson = objectMapper.writeValueAsString(result);
            
            // Use Lua script for atomic write
            List<String> keys = Arrays.asList(hashKey, versionKey);
            List<String> args = Arrays.asList(feature, valueJson, String.valueOf(result.getVersion() != null ? result.getVersion() : 0));
            
            @SuppressWarnings("unchecked")
            Map<String, Object> response = redisTemplate.execute(atomicWriteScript, keys, args.toArray());
            
            if (response != null && "ok".equals(response.get("ok"))) {
                Long newVersion = ((Number) response.get("version")).longValue();
                result.setVersion(newVersion);
                log.debug("Stored final result for symbol={}, feature={}, version={}", symbol, feature, newVersion);
                return newVersion;
            } else if (response != null && "VERSION_MISMATCH".equals(response.get("err"))) {
                log.warn("Version mismatch for symbol={}, feature={}. Current={}, Expected={}", 
                    symbol, feature, response.get("current"), response.get("expected"));
                return null;
            } else {
                log.error("Failed to store final result for symbol={}, feature={}", symbol, feature);
                return null;
            }
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize MetricResult for symbol={}, feature={}", 
                result.getSymbol(), result.getFeature(), e);
            return null;
        } catch (Exception e) {
            log.error("Error storing final result for symbol={}, feature={}", 
                result.getSymbol(), result.getFeature(), e);
            return null;
        }
    }
    
    /**
     * Store a partial metric result (non-atomic, doesn't increment version).
     * Used for in-progress calculations.
     */
    public void storePartialResult(MetricResult result) {
        if (result == null || result.getSymbol() == null || result.getFeature() == null) {
            log.warn("storePartialResult called with invalid result: {}", result);
            return;
        }
        
        try {
            String symbol = result.getSymbol();
            String feature = result.getFeature();
            
            result.setStatus("partial");
            if (result.getComputedAt() == null) {
                result.setComputedAt(Instant.now());
            }
            
            String hashKey = KEY_PREFIX_LATEST + symbol;
            String valueJson = objectMapper.writeValueAsString(result);
            
            // Non-atomic write for partial results (doesn't affect version)
            redisTemplate.opsForHash().put(hashKey, feature, valueJson);
            redisTemplate.expire(hashKey, DEFAULT_TTL);
            
            log.debug("Stored partial result for symbol={}, feature={}", symbol, feature);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize partial MetricResult for symbol={}, feature={}", 
                result.getSymbol(), result.getFeature(), e);
        } catch (Exception e) {
            log.error("Error storing partial result for symbol={}, feature={}", 
                result.getSymbol(), result.getFeature(), e);
        }
    }
    
    /**
     * Retrieve the latest metric result for a symbol and feature.
     * 
     * @param symbol The symbol identifier
     * @param feature The feature name
     * @return Optional MetricResult, or empty if not found
     */
    public Optional<MetricResult> getLatestResult(String symbol, String feature) {
        if (symbol == null || feature == null) {
            return Optional.empty();
        }
        
        try {
            String hashKey = KEY_PREFIX_LATEST + symbol;
            Object valueJson = redisTemplate.opsForHash().get(hashKey, feature);
            
            if (valueJson == null) {
                return Optional.empty();
            }
            
            MetricResult result = objectMapper.readValue(valueJson.toString(), MetricResult.class);
            return Optional.of(result);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize MetricResult for symbol={}, feature={}", symbol, feature, e);
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error retrieving latest result for symbol={}, feature={}", symbol, feature, e);
            return Optional.empty();
        }
    }
    
    /**
     * Retrieve all latest metric results for a symbol.
     * 
     * @param symbol The symbol identifier
     * @param features Optional list of features to retrieve. If null, retrieves all.
     * @return Map of feature name to MetricResult
     */
    public Map<String, MetricResult> getLatestResults(String symbol, Set<String> features) {
        Map<String, MetricResult> results = new HashMap<>();
        
        if (symbol == null) {
            return results;
        }
        
        try {
            String hashKey = KEY_PREFIX_LATEST + symbol;
            Map<Object, Object> hashData = redisTemplate.opsForHash().entries(hashKey);
            
            for (Map.Entry<Object, Object> entry : hashData.entrySet()) {
                String feature = entry.getKey().toString();
                
                // Filter by requested features if specified
                if (features != null && !features.contains(feature)) {
                    continue;
                }
                
                try {
                    MetricResult result = objectMapper.readValue(entry.getValue().toString(), MetricResult.class);
                    results.put(feature, result);
                } catch (JsonProcessingException e) {
                    log.warn("Failed to deserialize MetricResult for symbol={}, feature={}", symbol, feature, e);
                }
            }
        } catch (Exception e) {
            log.error("Error retrieving latest results for symbol={}", symbol, e);
        }
        
        return results;
    }
    
    /**
     * Get the current version for a symbol and feature.
     */
    public Long getVersion(String symbol, String feature) {
        if (symbol == null || feature == null) {
            return 0L;
        }
        
        try {
            String versionKey = KEY_PREFIX_VERSION + symbol + ":" + feature;
            String versionStr = redisTemplate.opsForValue().get(versionKey);
            return versionStr != null ? Long.parseLong(versionStr) : 0L;
        } catch (Exception e) {
            log.error("Error retrieving version for symbol={}, feature={}", symbol, feature, e);
            return 0L;
        }
    }
    
    /**
     * Clear all metrics for a symbol (useful for testing or reset).
     */
    public void clearMetrics(String symbol) {
        if (symbol == null) {
            return;
        }
        
        try {
            String hashKey = KEY_PREFIX_LATEST + symbol;
            redisTemplate.delete(hashKey);
            
            // Also clear version keys (we'd need to know all features, so we'll just expire them)
            // In practice, we can iterate through known features
            log.info("Cleared metrics for symbol={}", symbol);
        } catch (Exception e) {
            log.error("Error clearing metrics for symbol={}", symbol, e);
        }
    }
}

