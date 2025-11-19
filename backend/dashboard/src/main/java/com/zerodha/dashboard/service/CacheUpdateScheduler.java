package com.zerodha.dashboard.service;

import com.zerodha.dashboard.adapter.ZerodhaApiAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Scheduled service to periodically update the latest snapshot cache.
 * Fetches data from Zerodha Kite API and updates the cache to keep it fresh.
 * 
 * @deprecated Use DynamicCacheUpdateScheduler instead for runtime-configurable intervals.
 */
@Deprecated
@Service
public class CacheUpdateScheduler {

    private static final Logger log = LoggerFactory.getLogger(CacheUpdateScheduler.class);
    
    private final ZerodhaApiAdapter zerodhaApiAdapter;
    private final LatestSnapshotCacheService latestSnapshotCacheService;
    private final ZerodhaSessionService zerodhaSessionService;
    
    @Value("${zerodha.enabled:false}")
    private boolean zerodhaEnabled;
    
    @Value("${cache.update.interval.ms:750}")
    private long updateIntervalMs;
    
    @Value("${cache.update.enabled:true}")
    private boolean cacheUpdateEnabled;
    
    public CacheUpdateScheduler(
            ZerodhaApiAdapter zerodhaApiAdapter,
            LatestSnapshotCacheService latestSnapshotCacheService,
            ZerodhaSessionService zerodhaSessionService) {
        this.zerodhaApiAdapter = zerodhaApiAdapter;
        this.latestSnapshotCacheService = latestSnapshotCacheService;
        this.zerodhaSessionService = zerodhaSessionService;
    }
    
    /**
     * Scheduled task to update the cache every N milliseconds (default: 750ms = 0.75s).
     * This ensures the cache is always fresh for the /latest endpoint.
     * The interval should match or be faster than the minimum frontend polling rate (0.75s).
     */
    @Scheduled(fixedDelayString = "${cache.update.interval.ms:750}")
    public void updateCache() {
        if (!cacheUpdateEnabled || !zerodhaEnabled) {
            return;
        }
        
        if (!zerodhaSessionService.hasActiveAccessToken()) {
            log.debug("Skipping cache update - Zerodha session not active");
            return;
        }
        
        try {
            log.debug("Scheduled cache update started");
            Optional<DerivativesChain> chain = zerodhaApiAdapter.getDerivativesChain("NIFTY");
            
            if (chain.isPresent()) {
                latestSnapshotCacheService.updateCache(chain.get());
                log.debug("Cache updated successfully with {} contracts", chain.get().getTotalContracts());
            } else {
                log.debug("No data available for cache update");
            }
        } catch (Exception e) {
            log.error("Error updating cache in scheduled task: {}", e.getMessage(), e);
            // Don't throw - allow scheduler to continue
        }
    }
}

