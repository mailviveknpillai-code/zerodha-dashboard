package com.zerodha.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zerodha.dashboard.model.DerivativesChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Service to cache the latest derivatives chain snapshot for fast retrieval.
 * Uses Redis for persistence and in-memory cache for ultra-fast access.
 * Updates are atomic to prevent partial reads.
 */
@Service
public class LatestSnapshotCacheService {

    private static final Logger log = LoggerFactory.getLogger(LatestSnapshotCacheService.class);
    private static final String CACHE_KEY_PREFIX = "zerodha:latest:";
    
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Duration cacheTtl;
    private final String cacheKey;
    
    // In-memory cache for ultra-fast access (atomic updates)
    private volatile DerivativesChain inMemoryCache = null;
    private final ReentrantReadWriteLock cacheLock = new ReentrantReadWriteLock();
    
    public LatestSnapshotCacheService(
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            @Value("${redis.latest.cache.ttl:PT10M}") Duration cacheTtl,
            @Value("${redis.latest.cache.key:zerodha:latest:NIFTY}") String cacheKey) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.cacheTtl = cacheTtl;
        this.cacheKey = CACHE_KEY_PREFIX + cacheKey;
    }
    
    /**
     * Update the cache with the latest snapshot atomically.
     * This method replaces the entire snapshot to avoid partial reads.
     */
    public void updateCache(DerivativesChain chain) {
        if (chain == null) {
            log.warn("updateCache called with null chain");
            return;
        }
        
        try {
            // Serialize the entire chain atomically
            String chainJson = objectMapper.writeValueAsString(chain);
            
            // Update in-memory cache first (atomic write)
            cacheLock.writeLock().lock();
            try {
                inMemoryCache = chain;
            } finally {
                cacheLock.writeLock().unlock();
            }
            
            // Update Redis cache
            redisTemplate.opsForValue().set(cacheKey, chainJson, cacheTtl);
            
            log.debug("Updated latest snapshot cache for key={}, contracts={}", 
                    cacheKey, chain.getTotalContracts());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize DerivativesChain for cache update", e);
        } catch (Exception e) {
            log.error("Error updating latest snapshot cache", e);
        }
    }
    
    /**
     * Get the latest cached snapshot.
     * Returns from in-memory cache first (fastest), falls back to Redis if needed.
     */
    public Optional<DerivativesChain> getLatest() {
        // Try in-memory cache first (ultra-fast)
        cacheLock.readLock().lock();
        try {
            if (inMemoryCache != null) {
                log.debug("Cache hit from in-memory for key={}", cacheKey);
                return Optional.of(inMemoryCache);
            }
        } finally {
            cacheLock.readLock().unlock();
        }
        
        // Fallback to Redis
        try {
            String chainJson = redisTemplate.opsForValue().get(cacheKey);
            if (chainJson != null) {
                DerivativesChain chain = objectMapper.readValue(chainJson, DerivativesChain.class);
                
                // Update in-memory cache
                cacheLock.writeLock().lock();
                try {
                    inMemoryCache = chain;
                } finally {
                    cacheLock.writeLock().unlock();
                }
                
                log.debug("Cache hit from Redis for key={}", cacheKey);
                return Optional.of(chain);
            } else {
                log.debug("Cache miss for key={}", cacheKey);
                return Optional.empty();
            }
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize DerivativesChain from cache", e);
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error retrieving latest snapshot from cache", e);
            return Optional.empty();
        }
    }
    
    /**
     * Clear the cache (useful for testing or manual refresh)
     */
    public void clearCache() {
        cacheLock.writeLock().lock();
        try {
            inMemoryCache = null;
        } finally {
            cacheLock.writeLock().unlock();
        }
        redisTemplate.delete(cacheKey);
        log.info("Cleared latest snapshot cache for key={}", cacheKey);
    }
}




