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
 * Service to cache basic table values (8 columns: LTP, Bid Qty, Ask Qty, Delta, Bid Price, Ask Price, Volume, OI).
 * This cache is updated immediately when raw API data arrives and is read at UI refresh rate.
 * 
 * CRITICAL: This cache contains ONLY basic values from API polling - NO calculated metrics.
 * Calculated metrics (trend score, eaten delta, LTP movement, spot LTP trend) are stored separately.
 */
@Service
public class BasicValuesCacheService {

    private static final Logger log = LoggerFactory.getLogger(BasicValuesCacheService.class);
    private static final String CACHE_KEY_PREFIX = "zerodha:basic:";
    
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Duration cacheTtl;
    private final String cacheKey;
    
    // In-memory cache for ultra-fast access (atomic updates)
    private volatile DerivativesChain inMemoryCache = null;
    private final ReentrantReadWriteLock cacheLock = new ReentrantReadWriteLock();
    
    public BasicValuesCacheService(
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            @Value("${redis.basic.cache.ttl:PT10M}") Duration cacheTtl,
            @Value("${redis.basic.cache.key:zerodha:basic:NIFTY}") String cacheKey) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.cacheTtl = cacheTtl;
        this.cacheKey = CACHE_KEY_PREFIX + cacheKey;
    }
    
    /**
     * Update the cache with basic values ONLY (8 columns from API polling).
     * This method creates a clean chain with ONLY basic values, removing all calculated metrics.
     * 
     * Basic columns:
     * - lastPrice (LTP)
     * - bidQuantity
     * - askQuantity
     * - bid
     * - ask
     * - volume
     * - openInterest
     * - delta (calculated as bidQuantity - askQuantity, but from raw API data)
     */
    public void updateCache(DerivativesChain rawChain) {
        if (rawChain == null) {
            log.warn("updateCache called with null chain");
            return;
        }
        
        try {
            // Create a clean chain with ONLY basic values (no calculated metrics)
            DerivativesChain basicChain = createBasicChain(rawChain);
            
            // Serialize the basic chain atomically
            String chainJson = objectMapper.writeValueAsString(basicChain);
            
            // Update in-memory cache first (atomic write)
            cacheLock.writeLock().lock();
            try {
                inMemoryCache = basicChain;
            } finally {
                cacheLock.writeLock().unlock();
            }
            
            // Update Redis cache
            redisTemplate.opsForValue().set(cacheKey, chainJson, cacheTtl);
            
            log.debug("Updated basic values cache for key={}, contracts={}", 
                    cacheKey, basicChain.getTotalContracts());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize basic DerivativesChain for cache update", e);
        } catch (Exception e) {
            log.error("Error updating basic values cache", e);
        }
    }
    
    /**
     * Create a clean chain with ONLY basic values (no calculated metrics).
     */
    private DerivativesChain createBasicChain(DerivativesChain rawChain) {
        DerivativesChain basicChain = new DerivativesChain();
        
        // Copy basic chain-level properties
        basicChain.setUnderlying(rawChain.getUnderlying());
        basicChain.setSpotPrice(rawChain.getSpotPrice());
        basicChain.setDailyStrikePrice(rawChain.getDailyStrikePrice());
        basicChain.setTimestamp(rawChain.getTimestamp());
        basicChain.setDataSource(rawChain.getDataSource());
        
        // CRITICAL: Copy window metadata for UI timers (populated by independent services)
        // These are NOT calculated metrics - they're metadata about when calculations happen
        basicChain.setEatenDeltaWindowStart(rawChain.getEatenDeltaWindowStart());
        basicChain.setEatenDeltaWindowEnd(rawChain.getEatenDeltaWindowEnd());
        basicChain.setEatenDeltaWindowSeconds(rawChain.getEatenDeltaWindowSeconds());
        basicChain.setLtpMovementWindowStart(rawChain.getLtpMovementWindowStart());
        basicChain.setLtpMovementWindowEnd(rawChain.getLtpMovementWindowEnd());
        basicChain.setLtpMovementWindowSeconds(rawChain.getLtpMovementWindowSeconds());
        basicChain.setTrendWindowStart(rawChain.getTrendWindowStart());
        basicChain.setTrendWindowEnd(rawChain.getTrendWindowEnd());
        basicChain.setTrendWindowSeconds(rawChain.getTrendWindowSeconds());
        basicChain.setSpotLtpWindowStart(rawChain.getSpotLtpWindowStart());
        basicChain.setSpotLtpWindowEnd(rawChain.getSpotLtpWindowEnd());
        basicChain.setSpotLtpWindowSeconds(rawChain.getSpotLtpWindowSeconds());
        
        // Copy contracts with ONLY basic values
        if (rawChain.getFutures() != null) {
            rawChain.getFutures().forEach(contract -> {
                basicChain.addFutures(createBasicContract(contract));
            });
        }
        
        if (rawChain.getCallOptions() != null) {
            rawChain.getCallOptions().forEach(contract -> {
                basicChain.addCallOption(createBasicContract(contract));
            });
        }
        
        if (rawChain.getPutOptions() != null) {
            rawChain.getPutOptions().forEach(contract -> {
                basicChain.addPutOption(createBasicContract(contract));
            });
        }
        
        return basicChain;
    }
    
    /**
     * Create a contract with ONLY basic values (8 columns).
     */
    private com.zerodha.dashboard.model.DerivativeContract createBasicContract(
            com.zerodha.dashboard.model.DerivativeContract rawContract) {
        com.zerodha.dashboard.model.DerivativeContract basicContract = 
            new com.zerodha.dashboard.model.DerivativeContract();
        
        // Copy basic contract properties (8 columns)
        basicContract.setInstrumentToken(rawContract.getInstrumentToken());
        basicContract.setTradingsymbol(rawContract.getTradingsymbol());
        basicContract.setUnderlying(rawContract.getUnderlying());
        basicContract.setSegment(rawContract.getSegment());
        basicContract.setInstrumentType(rawContract.getInstrumentType());
        basicContract.setExpiryDate(rawContract.getExpiryDate());
        basicContract.setStrikePrice(rawContract.getStrikePrice());
        
        // Copy contract metadata (needed for UI display)
        basicContract.setLotSize(rawContract.getLotSize());
        basicContract.setTickSize(rawContract.getTickSize());
        
        // Basic values from API polling (8 columns)
        basicContract.setLastPrice(rawContract.getLastPrice()); // LTP
        basicContract.setBidQuantity(rawContract.getBidQuantity()); // Bid Qty
        basicContract.setAskQuantity(rawContract.getAskQuantity()); // Ask Qty
        basicContract.setBid(rawContract.getBid()); // Bid Price
        basicContract.setAsk(rawContract.getAsk()); // Ask Price
        basicContract.setVolume(rawContract.getVolume()); // Volume
        basicContract.setOpenInterest(rawContract.getOpenInterest()); // OI
        basicContract.setChange(rawContract.getChange()); // Δ Price (change from close)
        basicContract.setChangePercent(rawContract.getChangePercent()); // Δ Price % (change percent from close)
        
        // Copy OHLC data (needed for UI display)
        basicContract.setOpen(rawContract.getOpen());
        basicContract.setHigh(rawContract.getHigh());
        basicContract.setLow(rawContract.getLow());
        basicContract.setClose(rawContract.getClose());
        
        // Copy total traded value if available
        basicContract.setTotalTradedValue(rawContract.getTotalTradedValue());
        
        // Delta is calculated from bidQuantity - askQuantity (but from raw API data)
        // This is a simple calculation, not a windowed metric
        
        // CRITICAL: Copy eaten values (calculated by EatenDeltaService but needed in basic cache for UI display)
        // These are windowed metrics but must be included in basic cache so frontend can display them
        // CRITICAL: Preserve null values - UI should show neutral/empty state if no completed window yet
        // Do NOT convert null to 0 - null means "no data yet", 0 means "computed value is 0"
        basicContract.setEatenDelta(rawContract.getEatenDelta());
        basicContract.setBidEaten(rawContract.getBidEaten());
        basicContract.setAskEaten(rawContract.getAskEaten());
        
        // CRITICAL: Copy LTP movement values (calculated by LtpMovementService but needed in basic cache for UI display)
        // These are windowed metrics but must be included in basic cache so frontend can display them
        basicContract.setLtpMovementDirection(rawContract.getLtpMovementDirection());
        basicContract.setLtpMovementConfidence(rawContract.getLtpMovementConfidence());
        basicContract.setLtpMovementIntensity(rawContract.getLtpMovementIntensity());
        
        // DO NOT copy other calculated metrics (chain-level only):
        // - trendScore, trendClassification (chain-level, calculated by TrendCalculationService)
        // - spotLtpTrendPercent, spotLtpTrendDirection (chain-level, calculated by SpotLtpTrendService)
        
        basicContract.setTimestamp(rawContract.getTimestamp());
        
        return basicContract;
    }
    
    /**
     * Get the latest cached basic values snapshot.
     * Returns from in-memory cache first (fastest), falls back to Redis if needed.
     */
    public Optional<DerivativesChain> getLatest() {
        // Try in-memory cache first (ultra-fast)
        cacheLock.readLock().lock();
        try {
            if (inMemoryCache != null) {
                log.debug("Basic values cache hit from in-memory for key={}", cacheKey);
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
                
                log.debug("Basic values cache hit from Redis for key={}", cacheKey);
                return Optional.of(chain);
            } else {
                log.debug("Basic values cache miss for key={}", cacheKey);
                return Optional.empty();
            }
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize basic DerivativesChain from cache", e);
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error retrieving basic values from cache", e);
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
        log.info("Cleared basic values cache for key={}", cacheKey);
    }
}

