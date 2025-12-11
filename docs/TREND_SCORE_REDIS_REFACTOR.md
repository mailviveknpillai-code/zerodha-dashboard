# Trend Score Redis Refactoring

## Overview

The trend score calculation has been refactored to use a separate Redis cache, ensuring complete independence from UI refresh rates and other calculations. The system now follows a clear data flow:

```
API Poll (Zerodha API) → Master Cache (Redis) → Sub-Caches:
  - Trend Metrics Cache (Redis): Only LTP, Volume, Bid, Ask, BidQty, AskQty
  - Eaten Delta Cache (In-memory): Bid/Ask quantity changes
  - LTP Movement Cache (In-memory): LTP values for movement tracking
```

## Key Changes

### 1. **New Redis Cache Service: `TrendMetricsCacheService`**

- **Purpose**: Stores only the necessary fields for trend calculation in Redis
- **Fields Stored**: LTP, Volume, Bid, Ask, BidQty, AskQty, Timestamp
- **Redis Keys**:
  - `zerodha:trend:metrics:futures` - Futures metrics FIFO queue
  - `zerodha:trend:metrics:calls` - Call options metrics FIFO queue
  - `zerodha:trend:metrics:puts` - Put options metrics FIFO queue
- **FIFO Behavior**: Maintains a window of the last N API-polled values (configurable)
- **TTL**: 10 minutes (configurable via `redis.trend.cache.ttl`)

### 2. **Refactored `TrendCalculationService`**

- **Before**: Used in-memory `ConcurrentHashMap` for FIFO windows
- **After**: Uses Redis via `TrendMetricsCacheService`
- **Benefits**:
  - Persistence across restarts
  - Independent of application memory
  - Can be shared across multiple instances (if needed)
  - Clear separation of concerns

### 3. **Fixed Threshold Crossing Logic**

**Problem**: When thresholds were crossed, the smoothing logic was overriding the classification, preventing immediate bullish/bearish indication.

**Solution**: 
- **Priority Order**:
  1. **Threshold Crossing** (Highest Priority): If `bullishThreshold` or `bearishThreshold` is crossed, use that classification immediately
  2. **Smoothing** (Lower Priority): Only applied when thresholds are NOT crossed

**Code Logic**:
```java
if (bullishCrossed || bearishCrossed) {
    // Threshold crossed - use immediately (no smoothing)
    finalClassification = classification;
    // Clear smoothing history to allow immediate response
    classificationHistory.clear();
} else {
    // No threshold crossed - apply smoothing
    // ... majority rule logic ...
}
```

### 4. **Independence from Refresh Rates**

- **API Polling**: Only one API polling happens at the configured interval (via `DynamicCacheUpdateScheduler`)
- **Trend Calculation**: Reads from Redis cache, completely independent of:
  - UI refresh rate
  - Eaten delta window
  - LTP movement calculation
  - Other feature calculations

### 5. **Data Flow**

1. **API Poll** (at configured interval):
   - Fetches data from Zerodha API
   - Stores raw data in master cache (`LatestSnapshotCacheService`)

2. **Trend Metrics Extraction**:
   - Extracts only necessary fields (LTP, Volume, Bid, Ask, BidQty, AskQty)
   - Stores in Redis sub-cache (`TrendMetricsCacheService`)
   - Maintains FIFO window (last N API polls)

3. **Trend Calculation**:
   - Reads from Redis cache (not master cache)
   - Calculates segment scores (futures, calls, puts)
   - Combines with weights
   - Applies thresholds
   - Updates `DerivativesChain` with `trendClassification` and `trendScore`

4. **UI Display**:
   - Reads from master cache (which has calculated trend values)
   - Updates at UI refresh rate (independent of calculation)

## Configuration

- **Window Size**: Number of API polls to keep in FIFO (default: 5)
  - Configured via `/api/trend-calculation/window`
  - Stored in `TrendCalculationService.windowSize`

- **Thresholds**: 
  - Bullish Threshold (default: 3.0)
  - Bearish Threshold (default: -3.0)
  - Configured via `/api/trend-calculation/thresholds`

- **Redis TTL**: 10 minutes (configurable via `redis.trend.cache.ttl`)

## Benefits

1. **True Independence**: Trend calculation is completely independent of UI refresh rate
2. **Persistence**: Data survives application restarts
3. **Scalability**: Can be shared across multiple instances
4. **Correct Threshold Behavior**: Bullish/Bearish indication triggers immediately when thresholds are crossed
5. **Clear Separation**: Each sub-cache stores only what it needs

## Testing

To verify the implementation:

1. **Check Redis Keys**:
   ```bash
   redis-cli
   > KEYS zerodha:trend:metrics:*
   > GET zerodha:trend:metrics:futures
   ```

2. **Monitor Logs**:
   - Look for "Threshold crossed" messages when thresholds are exceeded
   - Verify "Calculated trend" messages show correct classification

3. **Test Threshold Crossing**:
   - Set bullish threshold to a low value (e.g., 1.0)
   - Verify that when score crosses 1.0, classification immediately becomes "Bullish"
   - Verify smoothing is bypassed when threshold is crossed

## Migration Notes

- Old in-memory FIFO windows are removed
- All trend metrics are now stored in Redis
- No data migration needed (starts fresh on first API poll)
- Backward compatible (same API endpoints)



