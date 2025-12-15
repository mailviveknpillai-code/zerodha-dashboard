# Eaten Delta Window Interval Fix

## Problem
The eaten delta window logic was not strictly respecting the set interval. Values were changing at irregular intervals (10-11 seconds) instead of the configured window size (e.g., 5 seconds).

## Root Cause
1. **Window initialization misalignment**: When `WindowData` was first created, `windowStartTime` was set to `Instant.now()`, which might not align with discrete window boundaries (0s, 5s, 10s, etc.).

2. **Window boundary detection timing**: Window changes were only detected when `calculateEatenDelta` was called (during API polls). If the API poll didn't happen exactly at the window boundary, there was a delay in detecting the window change.

3. **Boundary comparison precision**: Using `Instant.equals()` for comparison might have precision issues. Using epoch seconds comparison is more reliable.

## Solution

### 1. Aligned Window Initialization
```java
WindowData(int windowSeconds) {
    // Initialize windowStartTime to align with discrete window boundaries
    Instant now = Instant.now();
    long currentEpochSecond = now.getEpochSecond();
    long windowNumber = currentEpochSecond / windowSeconds;
    this.windowStartTime = Instant.ofEpochSecond(windowNumber * windowSeconds);
    // ... rest of initialization
}
```

This ensures that even the first window starts at a discrete boundary (e.g., if created at 2.3s with 5s window, it starts at 0s, not 2.3s).

### 2. Precise Boundary Detection
```java
// Use epoch seconds for exact comparison
long currentEpochSecond = currentTimestamp.getEpochSecond();
long windowNumber = currentEpochSecond / currentWindowSeconds;
Instant newWindowStart = Instant.ofEpochSecond(windowNumber * currentWindowSeconds);

long currentWindowStartEpoch = windowData.windowStartTime.getEpochSecond();
long newWindowStartEpoch = newWindowStart.getEpochSecond();
boolean windowChanged = currentWindowStartEpoch != newWindowStartEpoch;
```

This ensures exact boundary detection regardless of when the API poll occurs.

### 3. Edge Case Handling
Added check to force window reset if somehow we're past the window end but didn't detect the change:
```java
if (currentTimestamp.isAfter(currentWindowEnd)) {
    log.warn("Time is past window end - forcing window reset");
    windowData.resetWindow(newWindowStart);
}
```

## How It Works Now

### Example: 5-second window

**Wall-clock time boundaries**: 0s, 5s, 10s, 15s, 20s...

**Window behavior**:
- **0-5s**: Collect events, display `completedWindowResult` (initially 0)
- **At 5s boundary**: Calculate sum of events from 0-5s → `completedWindowResult`, display this value
- **5-10s**: Collect new events, display the 0-5s result (stable)
- **At 10s boundary**: Calculate sum of events from 5-10s → `completedWindowResult`, display this value
- **10-15s**: Collect new events, display the 5-10s result (stable)

**Key points**:
1. Window boundaries are **strictly time-based** (epoch seconds / window size)
2. Window changes are detected **immediately** when crossing a boundary, regardless of API polling timing
3. The UI displays the **previous completed window's result** for the entire duration of the current window
4. Values only change at **exact window boundaries** (5s, 10s, 15s...)

## Testing

To verify the fix works:
1. Set eaten delta window to 5 seconds
2. Monitor the eaten delta bubble values
3. Values should change **exactly** at 5-second intervals (5s, 10s, 15s, 20s...)
4. Check logs for "Started new discrete window" messages - they should appear at exact boundaries

## Logging

Enhanced logging now shows:
- Window creation with aligned start time
- Window changes with time since last window
- Window progress (occasional debug logs)
- Edge case warnings if timing issues occur

This helps diagnose any remaining timing issues.





