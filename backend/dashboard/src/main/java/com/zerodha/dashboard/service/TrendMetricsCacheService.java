package com.zerodha.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Redis cache service for trend score calculation metrics.
 * Stores only the necessary fields for trend calculation:
 * - LTP, Volume, Bid, Ask, BidQty, AskQty
 * 
 * This is a separate sub-cache that stores data from API polling.
 * The cache uses FIFO (First In First Out) to maintain a window of API-polled values.
 */
@Service
public class TrendMetricsCacheService {
    
    private static final Logger log = LoggerFactory.getLogger(TrendMetricsCacheService.class);
    private static final String CACHE_KEY_PREFIX = "zerodha:trend:metrics:";
    private static final String FUTURES_KEY = "futures";
    private static final String CALLS_KEY = "calls";
    private static final String PUTS_KEY = "puts";
    
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Duration cacheTtl;
    
    /**
     * Lightweight metrics snapshot for trend calculation.
     * Only contains fields necessary for trend score calculation.
     */
    public static class TrendMetricsSnapshot {
        private BigDecimal ltp;
        private long volume;
        private BigDecimal bid;
        private BigDecimal ask;
        private Long bidQty;
        private Long askQty;
        private Instant timestamp;
        
        public TrendMetricsSnapshot() {
            // Default constructor for Jackson
        }
        
        public TrendMetricsSnapshot(BigDecimal ltp, long volume, BigDecimal bid, BigDecimal ask,
                                   Long bidQty, Long askQty, Instant timestamp) {
            this.ltp = ltp;
            this.volume = volume;
            this.bid = bid;
            this.ask = ask;
            this.bidQty = bidQty;
            this.askQty = askQty;
            this.timestamp = timestamp;
        }
        
        // Getters and setters
        public BigDecimal getLtp() { return ltp; }
        public void setLtp(BigDecimal ltp) { this.ltp = ltp; }
        
        public long getVolume() { return volume; }
        public void setVolume(long volume) { this.volume = volume; }
        
        public BigDecimal getBid() { return bid; }
        public void setBid(BigDecimal bid) { this.bid = bid; }
        
        public BigDecimal getAsk() { return ask; }
        public void setAsk(BigDecimal ask) { this.ask = ask; }
        
        public Long getBidQty() { return bidQty; }
        public void setBidQty(Long bidQty) { this.bidQty = bidQty; }
        
        public Long getAskQty() { return askQty; }
        public void setAskQty(Long askQty) { this.askQty = askQty; }
        
        public Instant getTimestamp() { return timestamp; }
        public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    }
    
    public TrendMetricsCacheService(
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            @Value("${redis.trend.cache.ttl:PT10M}") Duration cacheTtl) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.cacheTtl = cacheTtl;
    }
    
    /**
     * Add a metrics snapshot to the FIFO cache for a segment.
     * 
     * @param segment "futures", "calls", or "puts"
     * @param snapshot The metrics snapshot to add
     * @param windowSize Maximum number of snapshots to keep (FIFO)
     */
    public void addSnapshot(String segment, TrendMetricsSnapshot snapshot, int windowSize) {
        if (snapshot == null || segment == null) {
            log.warn("addSnapshot: snapshot or segment is null");
            return;
        }
        
        try {
            String cacheKey = getCacheKey(segment);
            
            // Get existing snapshots
            List<TrendMetricsSnapshot> snapshots = getSnapshots(segment);
            
            // Add new snapshot
            snapshots.add(snapshot);
            
            // Maintain FIFO: remove oldest if exceeds window size
            while (snapshots.size() > windowSize) {
                snapshots.remove(0);
            }
            
            // Save back to Redis
            String snapshotsJson = objectMapper.writeValueAsString(snapshots);
            redisTemplate.opsForValue().set(cacheKey, snapshotsJson, cacheTtl);
            
            log.debug("addSnapshot: Added snapshot for segment={}, total snapshots={}, windowSize={}", 
                segment, snapshots.size(), windowSize);
        } catch (JsonProcessingException e) {
            log.error("addSnapshot: Failed to serialize snapshots for segment={}", segment, e);
        } catch (Exception e) {
            log.error("addSnapshot: Error adding snapshot for segment={}", segment, e);
        }
    }
    
    /**
     * Get all snapshots for a segment.
     * 
     * @param segment "futures", "calls", or "puts"
     * @return List of metrics snapshots (FIFO order, oldest first)
     */
    public List<TrendMetricsSnapshot> getSnapshots(String segment) {
        if (segment == null) {
            return new ArrayList<>();
        }
        
        try {
            String cacheKey = getCacheKey(segment);
            String snapshotsJson = redisTemplate.opsForValue().get(cacheKey);
            
            if (snapshotsJson != null) {
                List<TrendMetricsSnapshot> snapshots = objectMapper.readValue(
                    snapshotsJson,
                    objectMapper.getTypeFactory().constructCollectionType(
                        List.class, TrendMetricsSnapshot.class));
                log.debug("getSnapshots: Retrieved {} snapshots for segment={}", snapshots.size(), segment);
                return snapshots;
            } else {
                log.debug("getSnapshots: No snapshots found for segment={}", segment);
                return new ArrayList<>();
            }
        } catch (JsonProcessingException e) {
            log.error("getSnapshots: Failed to deserialize snapshots for segment={}", segment, e);
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("getSnapshots: Error retrieving snapshots for segment={}", segment, e);
            return new ArrayList<>();
        }
    }
    
    /**
     * Clear all snapshots for a segment (useful when window size changes).
     * 
     * @param segment "futures", "calls", or "puts"
     */
    public void clearSnapshots(String segment) {
        if (segment == null) {
            return;
        }
        
        try {
            String cacheKey = getCacheKey(segment);
            redisTemplate.delete(cacheKey);
            log.info("clearSnapshots: Cleared snapshots for segment={}", segment);
        } catch (Exception e) {
            log.error("clearSnapshots: Error clearing snapshots for segment={}", segment, e);
        }
    }
    
    /**
     * Trim snapshots to a new window size (keep most recent N snapshots).
     * 
     * @deprecated This method is no longer used. Window size changes are handled naturally by FIFO.
     * The addSnapshot method automatically maintains the window size by removing oldest when exceeded.
     * No manual trimming is needed or recommended.
     * 
     * @param segment "futures", "calls", or "puts"
     * @param newWindowSize New window size (number of snapshots to keep)
     */
    @Deprecated
    public void trimSnapshotsToWindowSize(String segment, int newWindowSize) {
        if (segment == null || newWindowSize <= 0) {
            return;
        }
        
        try {
            List<TrendMetricsSnapshot> snapshots = getSnapshots(segment);
            
            if (snapshots.size() > newWindowSize) {
                // Keep only the most recent N snapshots (remove oldest - FIFO)
                List<TrendMetricsSnapshot> trimmed = 
                    snapshots.subList(snapshots.size() - newWindowSize, snapshots.size());
                
                // Save trimmed list back to Redis
                String cacheKey = getCacheKey(segment);
                String trimmedJson = objectMapper.writeValueAsString(trimmed);
                redisTemplate.opsForValue().set(cacheKey, trimmedJson, cacheTtl);
                
                log.debug("trimSnapshotsToWindowSize: Trimmed {} snapshots to {} for segment={} (FIFO - kept most recent)", 
                    snapshots.size(), trimmed.size(), segment);
            } else {
                log.debug("trimSnapshotsToWindowSize: No trimming needed for segment={} - current size {} <= new size {}", 
                    segment, snapshots.size(), newWindowSize);
            }
        } catch (JsonProcessingException e) {
            log.warn("trimSnapshotsToWindowSize: Failed to trim snapshots for segment={}, will adapt naturally via FIFO", segment, e);
            // Don't fail - FIFO will handle it naturally on next addSnapshot
        } catch (Exception e) {
            log.warn("trimSnapshotsToWindowSize: Error trimming snapshots for segment={}, will adapt naturally via FIFO", segment, e);
            // Don't fail - FIFO will handle it naturally on next addSnapshot
        }
    }
    
    /**
     * Clear all trend metrics caches (all segments).
     * WARNING: This will reset trend calculation to 0. 
     * 
     * CRITICAL: This method should NEVER be called during normal operation.
     * It is only for emergency resets or testing. 
     * If you need to reset, use a separate admin endpoint with explicit confirmation.
     * 
     * @deprecated Use with extreme caution - will cause trend score to reset to 0
     */
    @Deprecated
    public void clearAll() {
        // Get counts before clearing
        int futuresBefore = getSnapshots(FUTURES_KEY).size();
        int callsBefore = getSnapshots(CALLS_KEY).size();
        int putsBefore = getSnapshots(PUTS_KEY).size();
        
        clearSnapshots(FUTURES_KEY);
        clearSnapshots(CALLS_KEY);
        clearSnapshots(PUTS_KEY);
        
        log.error("clearAll: CRITICAL - Cleared all trend metrics caches - futures: {}, calls: {}, puts: {} snapshots deleted. Trend calculation will reset to 0 until enough data is collected. This should not happen during normal operation!", 
            futuresBefore, callsBefore, putsBefore);
    }
    
    private String getCacheKey(String segment) {
        return CACHE_KEY_PREFIX + segment;
    }
}

