# Backend Cache Refactoring - Master Cache Architecture

## Problem Statement

The trend score, eaten delta, and LTP movement features were getting stuck on values and then suddenly updating. This was caused by:

1. **Shared State Issues**: Calculation services were modifying the same chain object, causing state conflicts
2. **No Error Tracking**: API polling failures weren't being tracked or exposed to the frontend
3. **Cache Contamination**: Master cache was storing calculated values mixed with raw data

## Solution Architecture

### Master Cache (LatestSnapshotCacheService)

**Purpose**: Store RAW data from API only - no calculations

**Flow**:
1. API polling fetches raw data from Zerodha API
2. Raw data is stored in master cache FIRST (before any calculations)
3. Calculations are performed on the raw chain
4. Calculated values are merged back into the chain
5. Final chain (raw + calculated) is stored in master cache

**Key Principle**: Master cache always has the latest raw data, even if calculations fail

### Calculation Services (Independent State)

Each calculation service maintains its own separate data structures:

#### 1. EatenDeltaService
- **State**: `previousSnapshots` (Map<String, PreviousSnapshot>)
- **State**: `windowDataMap` (Map<String, WindowData>)
- **Independence**: Each instrument has its own window data
- **Update Frequency**: Only when bid/ask quantities change (at API polling rate)

#### 2. TrendCalculationService
- **State**: `futuresWindowData` (Map<String, SegmentWindowData>)
- **State**: `callsWindowData` (Map<String, SegmentWindowData>)
- **State**: `putsWindowData` (Map<String, SegmentWindowData>)
- **Independence**: Each segment has its own FIFO window
- **Update Frequency**: On every API poll (adds snapshot to FIFO stack)

#### 3. LtpMovementService (Currently Disabled)
- **State**: `previousLtpSnapshots` (Map<String, PreviousLtpSnapshot>)
- **State**: `movementDataMap` (Map<String, MovementData>)
- **Independence**: Each instrument has its own movement cache
- **Update Frequency**: Only when LTP changes (at API polling rate)

### API Polling Error Tracking

**New Features**:
- `lastSuccessfulPoll`: Timestamp of last successful API poll
- `lastFailedPoll`: Timestamp of last failed API poll
- `lastError`: Error message from last failure
- `consecutiveFailures`: Count of consecutive failures
- `hasWarning`: Boolean flag when failures >= 3

**Endpoint**: `GET /api/api-polling-status`

**Response**:
```json
{
  "lastSuccessfulPoll": "2025-01-15T10:30:00Z",
  "lastFailedPoll": null,
  "lastError": null,
  "consecutiveFailures": 0,
  "hasWarning": false,
  "currentIntervalMs": 1000
}
```

### Scheduler Flow (DynamicCacheUpdateScheduler)

```
1. Check if Zerodha session is active
   └─> If not: Track error, increment failures, return

2. Fetch RAW data from Zerodha API
   └─> If empty: Track error, increment failures, log warning, return

3. Store RAW data in master cache FIRST
   └─> Ensures cache always has latest raw data

4. Perform calculations on raw chain
   ├─> EatenDeltaService.calculateEatenDelta() (maintains own state)
   └─> TrendCalculationService.calculateTrend() (maintains own FIFO windows)

5. Update master cache with calculated values
   └─> Chain now has raw data + calculated values

6. Reset error tracking on success
   └─> consecutiveFailures = 0, lastError = null
```

## Key Improvements

1. **Master Cache Separation**: Raw data is stored first, ensuring cache always has latest data
2. **Independent Calculations**: Each service maintains its own state, preventing conflicts
3. **Error Tracking**: API polling failures are tracked and exposed via endpoint
4. **Warning System**: Frontend can check polling status and display warnings
5. **Graceful Degradation**: If calculations fail, raw data is still available

## Frontend Integration

The frontend should:
1. Poll `/api/api-polling-status` periodically (e.g., every 5 seconds)
2. Display warning banner if `hasWarning === true`
3. Show error message from `lastError` if available
4. Indicate when last successful poll occurred

## Testing

To verify the fix:
1. Check that master cache always has raw data (even if calculations fail)
2. Verify each calculation service maintains independent state
3. Test API polling error tracking (simulate API failures)
4. Verify warnings are displayed in frontend when failures occur



