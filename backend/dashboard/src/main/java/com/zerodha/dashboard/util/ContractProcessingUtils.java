package com.zerodha.dashboard.util;

import com.zerodha.dashboard.model.DerivativeContract;
import com.zerodha.dashboard.model.DerivativesChain;

import java.util.List;
import java.util.function.Consumer;

/**
 * Utility class for processing contracts in a derivatives chain.
 * Eliminates code duplication across services that need to iterate over futures, calls, and puts.
 */
public final class ContractProcessingUtils {
    private ContractProcessingUtils() {
        // Utility class - prevent instantiation
    }
    
    /**
     * Process all contracts in a chain (futures, calls, puts) with a single processor.
     * 
     * @param chain The derivatives chain containing contracts to process
     * @param processor The function to apply to each contract
     */
    public static void processAllContracts(
            DerivativesChain chain, 
            Consumer<DerivativeContract> processor) {
        if (chain == null || processor == null) {
            return;
        }
        
        processContracts(chain.getFutures(), processor);
        processContracts(chain.getCallOptions(), processor);
        processContracts(chain.getPutOptions(), processor);
    }
    
    /**
     * Process a list of contracts safely.
     * Handles null checks and skips null contracts.
     * 
     * @param contracts The list of contracts to process (may be null)
     * @param processor The function to apply to each contract
     */
    public static void processContracts(
            List<DerivativeContract> contracts, 
            Consumer<DerivativeContract> processor) {
        if (contracts != null && processor != null) {
            contracts.forEach(contract -> {
                if (contract != null) {
                    processor.accept(contract);
                }
            });
        }
    }
}


