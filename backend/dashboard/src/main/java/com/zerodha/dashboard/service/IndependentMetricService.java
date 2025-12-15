package com.zerodha.dashboard.service;

import com.zerodha.dashboard.model.DerivativesChain;

/**
 * Interface for independent metric calculation services.
 * Each service operates completely independently like a microservice:
 * - Own window management
 * - Own cache/storage
 * - Own error handling
 * - No dependencies on other services
 */
public interface IndependentMetricService {
    
    /**
     * Process a derivatives chain and calculate metric independently.
     * This method should:
     * 1. Read from raw chain data
     * 2. Perform calculations using own internal state
     * 3. Store results in own cache/storage
     * 4. Update chain with calculated values
     * 
     * @param chain Raw derivatives chain data
     * @return true if processing succeeded, false otherwise
     */
    boolean process(DerivativesChain chain);
    
    /**
     * Get the name of this metric service (for logging/debugging).
     */
    String getServiceName();
    
    /**
     * Check if this service is enabled.
     */
    boolean isEnabled();
}



