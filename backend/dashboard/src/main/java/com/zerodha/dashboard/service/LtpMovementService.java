package com.zerodha.dashboard.service;

import com.zerodha.dashboard.model.DerivativeContract;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service to calculate LTP (Last Traded Price) movement direction.
 * 
 * Tracks price direction by analyzing Higher Highs (HH) or Higher Lows (HL) for UP trends
 * and Lower Highs (LH) or Lower Lows (LL) for DOWN trends.
 * 
 * IMPORTANT: This calculation is based on tick-by-tick LTP updates from the API polling,
 * NOT on UI refresh rate. It tracks actual price changes from the API.
 * 
 * Direction Rules:
 * - UP Direction = Higher High (HH) OR Higher Low (HL)
 * - DOWN Direction = Lower High (LH) OR Lower Low (LL)
 * 
 * This filters out noise by only tracking turning points (Highs and Lows).
 */
@Service
public class LtpMovementService {
    
    private static final Logger log = LoggerFactory.getLogger(LtpMovementService.class);
    
    private static final double MIN_CHANGE_PERCENT = 0.01; // 0.01% minimum change to consider
    
    // Configurable movement cache size (number of movements to track)
    private volatile int movementCacheSize = 5; // Default: 5 movements
    
    /**
     * Stores previous LTP values for each instrument.
     * Key: instrumentToken
     * Value: PreviousLtpSnapshot containing lastPrice and timestamp
     */
    private static class PreviousLtpSnapshot {
        final BigDecimal lastPrice;
        final Instant timestamp;
        
        PreviousLtpSnapshot(BigDecimal lastPrice, Instant timestamp) {
            this.lastPrice = lastPrice;
            this.timestamp = timestamp;
        }
    }
    
    /**
     * Stores movement cache for each instrument.
     * Key: instrumentToken
     * Value: MovementData containing movement history and cached result
     */
    private static class MovementData {
        final List<String> movementCache; // Last 5 movements: UP, DOWN, FLAT
        String cachedDirection; // Cached direction: UP, DOWN, NEUTRAL
        Integer cachedConfidence; // Cached confidence: 0-100
        String cachedIntensity; // Cached intensity: HIGH, SLOW
        BigDecimal previousPrice; // Previous price for comparison
        double recentChangePercent; // Recent change percentage for intensity
        
        MovementData() {
            this.movementCache = new ArrayList<>();
            this.cachedDirection = "NEUTRAL";
            this.cachedConfidence = 0;
            this.cachedIntensity = "SLOW";
            this.previousPrice = null;
            this.recentChangePercent = 0.0;
        }
        
        void reset() {
            movementCache.clear();
            cachedDirection = "NEUTRAL";
            cachedConfidence = 0;
            cachedIntensity = "SLOW";
            previousPrice = null;
            recentChangePercent = 0.0;
        }
    }
    
    private final Map<String, PreviousLtpSnapshot> previousLtpSnapshots = new ConcurrentHashMap<>();
    private final Map<String, MovementData> movementDataMap = new ConcurrentHashMap<>();
    
    /**
     * Calculate and update LTP movement for a contract.
     * This method is called when new data arrives from the API (at API polling rate).
     * 
     * @param contract The current contract snapshot (lastPrice must be set from API)
     */
    public void calculateLtpMovement(DerivativeContract contract) {
        try {
            if (contract == null || contract.getInstrumentToken() == null) {
                log.debug("calculateLtpMovement: contract or instrumentToken is null");
                return;
            }
            
            String instrumentToken = contract.getInstrumentToken();
            BigDecimal currentLtp = contract.getLastPrice();
            Instant currentTimestamp = contract.getTimestamp() != null 
                ? contract.getTimestamp() 
                : Instant.now();
            
            // If we don't have current LTP, set defaults
            if (currentLtp == null) {
                contract.setLtpMovementDirection("NEUTRAL");
                contract.setLtpMovementConfidence(0);
                contract.setLtpMovementIntensity("SLOW");
                log.debug("calculateLtpMovement: No LTP for {}, returning NEUTRAL", instrumentToken);
                return;
            }
            
            // Get or create movement data
            MovementData movementData = movementDataMap.computeIfAbsent(instrumentToken, 
                k -> new MovementData());
            
            // Get previous snapshot
            PreviousLtpSnapshot previous = previousLtpSnapshots.get(instrumentToken);
            
            // Check if LTP has actually changed
            boolean ltpChanged = false;
            if (previous != null && previous.lastPrice != null) {
                ltpChanged = !previous.lastPrice.equals(currentLtp);
            } else {
                // First time - initialize
                ltpChanged = true;
            }
            
            // If LTP hasn't changed, use cached result
            if (!ltpChanged && movementData.cachedDirection != null) {
                contract.setLtpMovementDirection(movementData.cachedDirection);
                contract.setLtpMovementConfidence(movementData.cachedConfidence);
                contract.setLtpMovementIntensity(movementData.cachedIntensity);
                log.debug("calculateLtpMovement: LTP unchanged for {}, using cached result - direction: {}, confidence: {}, intensity: {}", 
                    instrumentToken, movementData.cachedDirection, movementData.cachedConfidence, movementData.cachedIntensity);
                return;
            }
            
            // Calculate movement if LTP changed
            if (ltpChanged && previous != null && previous.lastPrice != null) {
                // Calculate change percentage
                BigDecimal change = currentLtp.subtract(previous.lastPrice);
                double changePercent = previous.lastPrice.compareTo(BigDecimal.ZERO) != 0
                    ? Math.abs(change.divide(previous.lastPrice, 6, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).doubleValue())
                    : 0.0;
                
                // Store recent change percentage for intensity calculation
                movementData.recentChangePercent = changePercent;
                
                // Determine movement direction (UP, DOWN, or FLAT)
                String movement = "FLAT";
                if (changePercent >= MIN_CHANGE_PERCENT) {
                    movement = change.compareTo(BigDecimal.ZERO) > 0 ? "UP" : "DOWN";
                }
                
                // Add movement to cache (keep last N movements, where N is configurable)
                if (!"FLAT".equals(movement)) {
                    movementData.movementCache.add(movement);
                    if (movementData.movementCache.size() > movementCacheSize) {
                        movementData.movementCache.remove(0);
                    }
                }
                
                // Analyze movement cache to determine direction
                List<String> movements = movementData.movementCache;
                
                String newDirection = "NEUTRAL";
                int newConfidence = 0;
                String newIntensity = "SLOW";
                
                if (movements.size() == 1) {
                    // Show immediate direction if we only have 1 movement
                    String lastMovement = movements.get(0);
                    newConfidence = Math.min(100, Math.max(1, (int)(changePercent * 2))); // Ensure at least 1% if movement detected
                    boolean isHighMovement = newConfidence >= 50 || changePercent >= 0.5;
                    newIntensity = isHighMovement ? "HIGH" : "SLOW";
                    
                    if ("UP".equals(lastMovement)) {
                        newDirection = "UP";
                    } else if ("DOWN".equals(lastMovement)) {
                        newDirection = "DOWN";
                    }
                } else if (movements.size() >= 2) {
                    // Analyze patterns when we have 2+ movements
                    List<String> lastTwo = movements.subList(Math.max(0, movements.size() - 2), movements.size());
                    
                    // Detect patterns from movement sequence
                    boolean hasHH = false; // Higher High: UP, UP
                    boolean hasHL = false; // Higher Low: UP, DOWN
                    boolean hasLH = false; // Lower High: DOWN, UP
                    boolean hasLL = false; // Lower Low: DOWN, DOWN
                    
                    // Check last two movements
                    if (lastTwo.size() == 2) {
                        if ("UP".equals(lastTwo.get(0)) && "UP".equals(lastTwo.get(1))) {
                            hasHH = true;
                        } else if ("UP".equals(lastTwo.get(0)) && "DOWN".equals(lastTwo.get(1))) {
                            hasHL = true;
                        } else if ("DOWN".equals(lastTwo.get(0)) && "UP".equals(lastTwo.get(1))) {
                            hasLH = true;
                        } else if ("DOWN".equals(lastTwo.get(0)) && "DOWN".equals(lastTwo.get(1))) {
                            hasLL = true;
                        }
                    }
                    
                    // Check full cache for patterns
                    if (movements.size() >= 3) {
                        for (int i = 0; i < movements.size() - 1; i++) {
                            if ("UP".equals(movements.get(i)) && "UP".equals(movements.get(i + 1))) {
                                hasHH = true;
                            }
                            if ("UP".equals(movements.get(i)) && "DOWN".equals(movements.get(i + 1))) {
                                hasHL = true;
                            }
                            if ("DOWN".equals(movements.get(i)) && "UP".equals(movements.get(i + 1))) {
                                hasLH = true;
                            }
                            if ("DOWN".equals(movements.get(i)) && "DOWN".equals(movements.get(i + 1))) {
                                hasLL = true;
                            }
                        }
                    }
                    
                    // Determine direction: UP = HH OR HL, DOWN = LH OR LL
                    if (hasHH || hasHL) {
                        newDirection = "UP";
                        // Calculate confidence based on pattern strength
                        long upCount = movements.stream().filter(m -> "UP".equals(m)).count();
                        double upRatio = (double) upCount / movements.size();
                        if (hasHH && hasHL) {
                            newConfidence = Math.min(100, (int)(upRatio * 100 * 1.2)); // 20% boost for both patterns
                        } else {
                            newConfidence = Math.min(100, (int)(upRatio * 100));
                        }
                    } else if (hasLH || hasLL) {
                        newDirection = "DOWN";
                        // Calculate confidence based on pattern weakness
                        long downCount = movements.stream().filter(m -> "DOWN".equals(m)).count();
                        double downRatio = (double) downCount / movements.size();
                        if (hasLH && hasLL) {
                            newConfidence = Math.min(100, (int)(downRatio * 100 * 1.2)); // 20% boost for both patterns
                        } else {
                            newConfidence = Math.min(100, (int)(downRatio * 100));
                        }
                    }
                    
                    // Calculate intensity: HIGH if confidence >= 50% OR recent change >= 0.5%
                    boolean isHighMovement = newConfidence >= 50 || movementData.recentChangePercent >= 0.5;
                    newIntensity = isHighMovement ? "HIGH" : "SLOW";
                }
                
                // Update cached result
                movementData.cachedDirection = newDirection;
                movementData.cachedConfidence = newConfidence;
                movementData.cachedIntensity = newIntensity;
                movementData.previousPrice = currentLtp;
                
                // Set values on contract
                contract.setLtpMovementDirection(newDirection);
                contract.setLtpMovementConfidence(newConfidence);
                contract.setLtpMovementIntensity(newIntensity);
                
                log.debug("calculateLtpMovement: Calculated for {} - direction: {}, confidence: {}, intensity: {}, changePercent: {}", 
                    instrumentToken, newDirection, newConfidence, newIntensity, changePercent);
            } else {
                // First time - initialize with NEUTRAL
                contract.setLtpMovementDirection("NEUTRAL");
                contract.setLtpMovementConfidence(0);
                contract.setLtpMovementIntensity("SLOW");
                movementData.cachedDirection = "NEUTRAL";
                movementData.cachedConfidence = 0;
                movementData.cachedIntensity = "SLOW";
                movementData.previousPrice = currentLtp;
            }
            
            // Update previous snapshot
            previousLtpSnapshots.put(instrumentToken, new PreviousLtpSnapshot(currentLtp, currentTimestamp));
            
        } catch (Exception e) {
            log.error("Error calculating LTP movement for contract: {}", e.getMessage(), e);
            // Set defaults on error
            if (contract != null) {
                contract.setLtpMovementDirection("NEUTRAL");
                contract.setLtpMovementConfidence(0);
                contract.setLtpMovementIntensity("SLOW");
            }
        }
    }
    
    /**
     * Set the movement cache size (number of movements to track).
     * This determines how many movements are kept in the cache for pattern detection.
     * 
     * @param size Number of movements to track (minimum 2, recommended 3-10)
     */
    public void setMovementCacheSize(int size) {
        if (size < 2) {
            log.warn("Invalid movement cache size: {}, using minimum 2", size);
            size = 2;
        }
        if (size > 20) {
            log.warn("Movement cache size too large: {}, capping at 20", size);
            size = 20;
        }
        
        int oldSize = this.movementCacheSize;
        this.movementCacheSize = size;
        
        // Clear all movement data when cache size changes
        movementDataMap.clear();
        log.info("LTP movement cache size set to {} movements (was {} movements)", size, oldSize);
    }
    
    /**
     * Get the current movement cache size.
     * 
     * @return Number of movements tracked in the cache
     */
    public int getMovementCacheSize() {
        return movementCacheSize;
    }
}

