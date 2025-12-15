# Independent Microservices Architecture

## Overview

The four metric calculation services (LTP Movement, Spot LTP Movement, Bid/Ask Eaten, Trend Score) have been refactored to operate as completely independent microservices. Each service:

- **Own Window Management**: Isolated window state per service
- **Own Cache/Storage**: Isolated Redis keys per service
- **Own Error Handling**: Isolated try-catch blocks
- **No Dependencies**: Services don't depend on each other
- **Independent Processing**: Each reads from raw chain data independently

## Architecture

### Service Interface

All independent services implement `IndependentMetricService`:

```java
public interface IndependentMetricService {
    boolean process(DerivativesChain chain);
    String getServiceName();
    boolean isEnabled();
}
```

### Independent Services

1. **IndependentTrendScoreService**
   - Feature: `trendScore`
   - Symbol: `NIFTY` (chain-level)
   - Window Management: Isolated via `WindowManager.getWindowState("trendScore", "NIFTY", ...)`
   - Cache Keys: `latest:trendScore`, `version:trendScore:NIFTY`

2. **IndependentLtpMovementService**
   - Feature: `ltpMovement`
   - Symbol: Per contract (`instrumentToken`)
   - Window Management: Isolated per contract via `WindowManager.getWindowState("ltpMovement", instrumentToken, ...)`
   - Cache Keys: `latest:{instrumentToken}`, `version:ltpMovement:{instrumentToken}`

3. **IndependentSpotLtpTrendService**
   - Feature: `spotLtpMovement`
   - Symbol: `NIFTY` (chain-level)
   - Window Management: Isolated via `WindowManager.getWindowState("spotLtpMovement", "NIFTY", ...)`
   - Cache Keys: `latest:spotLtpMovement`, `version:spotLtpMovement:NIFTY`

4. **IndependentBidAskEatenService**
   - Feature: `bidAskEaten`
   - Symbol: Per contract (`instrumentToken`)
   - Window Management: Isolated per contract via `WindowManager.getWindowState("bidAskEaten", instrumentToken, ...)`
   - Cache Keys: `latest:{instrumentToken}`, `version:bidAskEaten:{instrumentToken}`

## Processing Flow

### DynamicCacheUpdateScheduler

The scheduler now calls each independent service separately:

```java
for (IndependentMetricService service : independentServices) {
    if (!service.isEnabled()) {
        continue;
    }
    
    try {
        // Each service processes independently - isolated error handling
        boolean success = service.process(rawChain);
        if (!success) {
            log.warn("{} service returned false, but continuing with other services", 
                service.getServiceName());
        }
    } catch (Exception e) {
        // Isolated error handling - one service failure doesn't affect others
        log.error("Error in {} service: {}", service.getServiceName(), e.getMessage(), e);
        // Continue with next service
    }
}
```

### Service Processing Steps

Each service follows the same pattern:

1. **Read from Raw Chain**: Service reads raw data from `DerivativesChain`
2. **Calculate**: Uses underlying calculation service (maintains own internal state)
3. **Get Window State**: Gets isolated window state from `WindowManager`
4. **Store Result**: Stores result in `MetricsCacheService` with isolated keys
5. **Populate Chain**: Populates chain with final values from own cache

## Benefits

1. **Isolation**: One service failure doesn't affect others
2. **Independence**: Changes to one service don't affect others
3. **Scalability**: Each service can be scaled independently
4. **Maintainability**: Clear separation of concerns
5. **Testability**: Each service can be tested independently

## Backward Compatibility

- Legacy services (`EatenDeltaService`, `LtpMovementService`, etc.) are still available but deprecated
- `MetricsCalculationOrchestrator` is still available but no longer used by `DynamicCacheUpdateScheduler`
- All existing API endpoints continue to work

## Future Enhancements

- Each service could be moved to a separate microservice
- Each service could have its own database/cache
- Each service could be deployed independently
- Each service could have its own API gateway



