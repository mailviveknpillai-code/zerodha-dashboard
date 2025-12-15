package com.zerodha.dashboard.util;

import org.slf4j.Logger;

import java.util.Optional;
import java.util.function.Supplier;

/**
 * Utility class for standardized error handling across services.
 * Reduces code duplication in try-catch blocks.
 */
public final class ErrorHandlingUtils {
    private ErrorHandlingUtils() {
        // Utility class - prevent instantiation
    }
    
    /**
     * Execute an operation with standardized error handling and return Optional result.
     * 
     * @param operation The operation to execute
     * @param logger The logger to use for error messages
     * @param operationName The name of the operation (for logging)
     * @param defaultValue The default value to return on error (may be null)
     * @param <T> The return type
     * @return Optional containing the result, or Optional.of(defaultValue) on error
     */
    public static <T> Optional<T> executeSafely(
            Supplier<T> operation, 
            Logger logger, 
            String operationName,
            T defaultValue) {
        try {
            T result = operation.get();
            return Optional.ofNullable(result);
        } catch (Exception e) {
            logger.error("Error in {}: {}", operationName, e.getMessage(), e);
            return Optional.ofNullable(defaultValue);
        }
    }
    
    /**
     * Execute an operation with standardized error handling and return Optional result.
     * Returns Optional.empty() on error.
     * 
     * @param operation The operation to execute
     * @param logger The logger to use for error messages
     * @param operationName The name of the operation (for logging)
     * @param <T> The return type
     * @return Optional containing the result, or Optional.empty() on error
     */
    public static <T> Optional<T> executeSafely(
            Supplier<T> operation, 
            Logger logger, 
            String operationName) {
        return executeSafely(operation, logger, operationName, null);
    }
    
    /**
     * Execute a void operation with standardized error handling.
     * 
     * @param operation The operation to execute
     * @param logger The logger to use for error messages
     * @param operationName The name of the operation (for logging)
     */
    public static void executeSafely(
            Runnable operation, 
            Logger logger, 
            String operationName) {
        try {
            operation.run();
        } catch (Exception e) {
            logger.error("Error in {}: {}", operationName, e.getMessage(), e);
        }
    }
}


