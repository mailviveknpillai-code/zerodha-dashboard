package com.zerodha.dashboard.service.impl;

import com.zerodha.dashboard.model.DerivativeContract;
import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.model.MetricResult;
import com.zerodha.dashboard.service.EatenDeltaService;
import com.zerodha.dashboard.service.MetricsCacheService;
import com.zerodha.dashboard.service.IndependentMetricService;
import com.zerodha.dashboard.util.ContractProcessingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Independent Bid/Ask Eaten Service - operates as a microservice.
 * 
 * CRITICAL: Uses time-driven windows (NOT API-poll-driven).
 * - Windows are computed from epoch time, independent of API polling
 * - Completed window results are immutable
 * - UI reads only lastCompletedWindow
 * - Zero-change polls are ignored
 */
@Service
public class IndependentBidAskEatenService implements IndependentMetricService {
    
    private static final Logger log = LoggerFactory.getLogger(IndependentBidAskEatenService.class);
    private static final String SERVICE_NAME = "BidAskEaten";
    private static final String FEATURE_NAME = "bidAskEaten";
    
    private final EatenDeltaService eatenDeltaService;
    private final MetricsCacheService metricsCacheService;
    
    public IndependentBidAskEatenService(
            EatenDeltaService eatenDeltaService,
            MetricsCacheService metricsCacheService) {
        this.eatenDeltaService = eatenDeltaService;
        this.metricsCacheService = metricsCacheService;
    }
    
    @Override
    public boolean process(DerivativesChain chain) {
        if (chain == null) {
            log.debug("{}: Chain is null, skipping", SERVICE_NAME);
            return false;
        }
        
        try {
            Instant now = Instant.now();
            
            // Process all contracts - each contract processes independently
            ContractProcessingUtils.processAllContracts(chain, 
                contract -> processSingleContract(contract, now));
            
            // Populate chain-level window metadata for UI timer
            populateWindowMetadata(chain, now);
            
            return true;
            
        } catch (Exception e) {
            log.error("{}: Error processing chain - {}", SERVICE_NAME, e.getMessage(), e);
            // Isolated error handling - don't affect other services
            return false;
        }
    }
    
    /**
     * Process a single contract.
     * CRITICAL ORDER:
     * 1. Process API poll (handles window rollover, calculates eaten values, updates snapshot)
     * 2. Get last completed window result (IMMUTABLE - UI reads this only)
     * 3. Store in cache and populate contract values
     */
    private void processSingleContract(DerivativeContract contract, Instant now) {
        if (contract == null || contract.getInstrumentToken() == null) {
            log.debug("{}: Skipping null contract or missing instrumentToken", SERVICE_NAME);
            return;
        }
        
        try {
            String instrumentToken = contract.getInstrumentToken();
            String contractType = contract.getTradingsymbol() != null 
                ? (contract.getTradingsymbol().contains("FUT") ? "FUTURES" 
                   : contract.getTradingsymbol().contains("CE") ? "CALLS" 
                   : contract.getTradingsymbol().contains("PE") ? "PUTS" : "UNKNOWN")
                : "UNKNOWN";
            
            Long bidQty = contract.getBidQuantity();
            Long askQty = contract.getAskQuantity();
            
            log.debug("{}: Processing {} contract {} ({}) - bidQty: {}, askQty: {}", 
                SERVICE_NAME, contractType, instrumentToken, contract.getTradingsymbol(), 
                bidQty, askQty);
            
            // STEP 1: Process API poll
            // This handles window rollover, calculates eaten values, and updates snapshot
            // CRITICAL: Window rollover happens INSIDE processApiPoll BEFORE calculation
            eatenDeltaService.processApiPoll(contract, now);
            
            // STEP 2: Get last completed window result (IMMUTABLE - UI reads this only)
            // CRITICAL: Returns null if no window has completed yet (UI shows neutral/empty state)
            EatenDeltaService.WindowResult lastCompletedWindow = 
                eatenDeltaService.getLastCompletedWindow(instrumentToken);
            
            Long eatenDelta;
            Long bidEaten;
            Long askEaten;
            Double value;
            
            if (lastCompletedWindow != null) {
                // Use completed window result (IMMUTABLE)
                eatenDelta = lastCompletedWindow.eatenDelta;
                bidEaten = lastCompletedWindow.bidEaten;
                askEaten = lastCompletedWindow.askEaten;
                value = (double) eatenDelta;
                
                log.info("{}: Using completed window {} for {} ({}) - eatenDelta={}, bidEaten={}, askEaten={}", 
                    SERVICE_NAME, lastCompletedWindow.windowId, instrumentToken, contract.getTradingsymbol(), 
                    eatenDelta, bidEaten, askEaten);
            } else {
                // No completed window yet - UI should show neutral/empty state (not "0" as computed value)
                // But we still need to set values on contract for backward compatibility
                // Use null to indicate "no data yet" (UI can handle this)
                eatenDelta = null;
                bidEaten = null;
                askEaten = null;
                value = null;
                
                log.debug("{}: No completed window for {} ({}) yet - UI should show neutral/empty state", 
                    SERVICE_NAME, instrumentToken, contract.getTradingsymbol());
            }
            
            // STEP 3: Store in cache
            String contractSymbol = instrumentToken;
            
            if (lastCompletedWindow != null) {
                // Store final result (window has completed)
                MetricResult result = new MetricResult(contractSymbol, FEATURE_NAME, value);
                result.setComputedAt(now);
                result.setStatus("final");
                result.setBidEaten(bidEaten);
                result.setAskEaten(askEaten);
                result.setVersion(metricsCacheService.getVersion(contractSymbol, FEATURE_NAME));
                
                metricsCacheService.storeFinalResult(result);
                log.debug("{}: Stored FINAL result for {} ({}) - eatenDelta={}, bidEaten={}, askEaten={}", 
                    SERVICE_NAME, contractSymbol, contract.getTradingsymbol(), value, bidEaten, askEaten);
            } else {
                // No completed window yet - don't store anything (or store as "pending")
                // This ensures UI doesn't show stale "0" values
                log.debug("{}: No completed window for {} ({}), not storing in cache", 
                    SERVICE_NAME, contractSymbol, contract.getTradingsymbol());
            }
            
            // STEP 4: Populate contract values
            // CRITICAL: Only set values if we have a completed window result
            // If null, contract values remain null (UI shows neutral/empty state)
            if (lastCompletedWindow != null) {
                contract.setEatenDelta(eatenDelta);
                contract.setBidEaten(bidEaten);
                contract.setAskEaten(askEaten);
                
                log.debug("{}: Populated contract {} ({}) - eatenDelta={}, bidEaten={}, askEaten={}", 
                    SERVICE_NAME, contractSymbol, contract.getTradingsymbol(), 
                    contract.getEatenDelta(), contract.getBidEaten(), contract.getAskEaten());
            } else {
                // No completed window - set to null (UI handles this as neutral/empty)
                contract.setEatenDelta(null);
                contract.setBidEaten(null);
                contract.setAskEaten(null);
                
                log.debug("{}: No completed window for {} ({}), contract values set to null", 
                    SERVICE_NAME, contractSymbol, contract.getTradingsymbol());
            }
            
        } catch (Exception e) {
            log.error("{}: Error processing contract {} ({}) - {}", 
                SERVICE_NAME, contract.getInstrumentToken(), 
                contract != null ? contract.getTradingsymbol() : "null", e.getMessage(), e);
        }
    }
    
    /**
     * Populate chain with window metadata for UI timer display.
     * Uses EatenDeltaService to get window metadata (time-driven, not API-poll-driven).
     */
    private void populateWindowMetadata(DerivativesChain chain, Instant now) {
        try {
            // Get window metadata from EatenDeltaService
            EatenDeltaService.WindowMetadata metadata = eatenDeltaService.getWindowMetadata(now);
            
            chain.setEatenDeltaWindowSeconds(metadata.windowSeconds);
            chain.setEatenDeltaWindowStart(metadata.windowStart);
            chain.setEatenDeltaWindowEnd(metadata.windowEnd);
            
            log.debug("{}: Populated window metadata - windowSeconds={}, windowStart={}, windowEnd={}", 
                SERVICE_NAME, metadata.windowSeconds, metadata.windowStart, metadata.windowEnd);
            
        } catch (Exception e) {
            log.error("{}: Error populating window metadata", SERVICE_NAME, e);
        }
    }
    
    @Override
    public String getServiceName() {
        return SERVICE_NAME;
    }
    
    @Override
    public boolean isEnabled() {
        return true; // Always enabled
    }
}
