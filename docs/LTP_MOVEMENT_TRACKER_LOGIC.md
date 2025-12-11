# LTP Movement Tracker - Detailed Logic and Examples

## Overview

The LTP (Last Traded Price) Movement Tracker analyzes price movements to determine direction (UP/DOWN/NEUTRAL), confidence (0-100%), and intensity (HIGH/SLOW). It displays this information as an arrow indicator (↑/↑↑/↓/↓↓) with a percentage in a bubble above the LTP value.

## Core Principles

1. **Tracks Turning Points, Not Every Tick**: Only records movements that exceed a minimum change threshold (default: 0.01%)
2. **Pattern-Based Direction**: Uses technical analysis patterns (HH, HL, LH, LL) to determine direction
3. **Movement Cache**: Maintains a rolling cache of the last 5 significant movements
4. **Real-Time Calculation**: Calculates on every price update from the UI refresh rate

---

## Step-by-Step Logic Flow

### Step 1: Movement Detection

**What happens:**
- On each price update, compare current price with previous price
- Calculate percentage change: `|(current - previous) / previous| * 100`
- If change >= `minChangePercent` (0.01%), record a movement:
  - `UP` if price increased
  - `DOWN` if price decreased
  - `FLAT` if change < 0.01% (not recorded in cache)

**Example:**
```
Previous Price: 100.00
Current Price:  100.05
Change:         0.05
Change %:       0.05% (>= 0.01%, so movement detected)
Movement:       UP
```

### Step 2: Movement Cache Management

**What happens:**
- Maintain a cache of the last 5 non-FLAT movements
- When a new movement is detected, add it to the cache
- If cache exceeds 5 movements, remove the oldest (FIFO)

**Example Cache Evolution:**
```
Initial:        []
After 1st:      [UP]
After 2nd:      [UP, UP]
After 3rd:      [UP, UP, DOWN]
After 4th:      [UP, UP, DOWN, UP]
After 5th:      [UP, UP, DOWN, UP, DOWN]
After 6th:      [UP, DOWN, UP, DOWN, UP]  // Oldest UP removed
```

### Step 3: Pattern Detection

**Patterns Detected from Movement Cache:**

1. **HH (Higher High)**: `UP, UP` - Two consecutive upward movements
2. **HL (Higher Low)**: `UP, DOWN` - Up then down (the low after an up is higher)
3. **LH (Lower High)**: `DOWN, UP` - Down then up (the high after a down is lower)
4. **LL (Lower Low)**: `DOWN, DOWN` - Two consecutive downward movements

**Pattern Detection Logic:**
- Check the last 2 movements for immediate patterns
- Also scan the entire cache (if >= 3 movements) for pattern confirmation

**Example Pattern Detection:**
```
Cache: [UP, UP, DOWN, UP, DOWN]

Last 2: [UP, DOWN] → HL detected
Full scan:
  - [UP, UP] at positions 0-1 → HH detected
  - [UP, DOWN] at positions 1-2 → HL detected
  - [DOWN, UP] at positions 2-3 → LH detected
  - [UP, DOWN] at positions 3-4 → HL detected

Result: hasHH = true, hasHL = true, hasLH = true, hasLL = false
```

### Step 4: Direction Determination

**Rules:**
- **UP Direction**: `hasHH OR hasHL` (Higher High OR Higher Low)
- **DOWN Direction**: `hasLH OR hasLL` (Lower High OR Lower Low)
- **NEUTRAL**: No clear pattern detected

**Example:**
```
Cache: [UP, UP, DOWN]
Patterns: HH=true, HL=false, LH=false, LL=false
Direction: UP (because hasHH is true)
```

```
Cache: [DOWN, DOWN, UP]
Patterns: HH=false, HL=false, LH=true, LL=true
Direction: DOWN (because hasLH OR hasLL is true)
```

### Step 5: Confidence Calculation

**For UP Direction:**
- Count UP movements in cache: `upCount`
- Calculate ratio: `upRatio = upCount / totalMovements`
- Base confidence: `upRatio * 100`
- If both HH and HL exist: `confidence = upRatio * 100 * 1.2` (20% boost)
- Cap at 100%

**For DOWN Direction:**
- Count DOWN movements in cache: `downCount`
- Calculate ratio: `downRatio = downCount / totalMovements`
- Base confidence: `downRatio * 100`
- If both LH and LL exist: `confidence = downRatio * 100 * 1.2` (20% boost)
- Cap at 100%

**For Single Movement (Special Case):**
- If cache has only 1 movement, confidence = `min(100, changePercent * 2)`
- Ensures at least 1% confidence if movement detected

**Examples:**
```
Cache: [UP, UP, DOWN, UP, DOWN]
Direction: UP
upCount = 3, totalMovements = 5
upRatio = 3/5 = 0.6
hasHH = true, hasHL = true
Confidence = 0.6 * 100 * 1.2 = 72%
```

```
Cache: [DOWN, DOWN, UP]
Direction: DOWN
downCount = 2, totalMovements = 3
downRatio = 2/3 = 0.667
hasLH = true, hasLL = true
Confidence = 0.667 * 100 * 1.2 = 80%
```

### Step 6: Intensity Calculation

**Intensity determines arrow style:**
- **HIGH**: Double arrow (↑↑ or ↓↓)
- **SLOW**: Single arrow (↑ or ↓)

**Calculation:**
- `intensity = HIGH` if:
  - `confidence >= 50%` OR
  - `recentChangePercent >= 0.5%`
- Otherwise: `intensity = SLOW`

**Examples:**
```
Confidence: 72%, Recent Change: 0.03%
→ HIGH (because confidence >= 50%)
→ Display: ↑↑ 72%
```

```
Confidence: 30%, Recent Change: 0.6%
→ HIGH (because recent change >= 0.5%)
→ Display: ↑↑ 30%
```

```
Confidence: 25%, Recent Change: 0.02%
→ SLOW (neither condition met)
→ Display: ↑ 25%
```

### Step 7: Display Logic

**Arrow Symbols:**
- `↑` - Slow upward movement
- `↑↑` - High upward movement
- `↓` - Slow downward movement
- `↓↓` - High downward movement
- `→` - Neutral (no clear direction)

**Bubble Display:**
- Always visible (even for NEUTRAL)
- Shows: `[Arrow] [Confidence%]` or `[Arrow] —` if confidence is 0
- Color coding:
  - Green: UP direction
  - Red: DOWN direction
  - Gray: NEUTRAL

---

## Complete Example Scenarios

### Scenario 1: Strong Uptrend

**Price Sequence:**
```
T0: 100.00 (initial)
T1: 100.10 (+0.10%) → Movement: UP, Cache: [UP]
T2: 100.25 (+0.15%) → Movement: UP, Cache: [UP, UP]
T3: 100.20 (-0.05%) → Movement: DOWN, Cache: [UP, UP, DOWN]
T4: 100.35 (+0.15%) → Movement: UP, Cache: [UP, UP, DOWN, UP]
T5: 100.30 (-0.05%) → Movement: DOWN, Cache: [UP, UP, DOWN, UP, DOWN]
```

**Analysis at T5:**
- Patterns: HH=true (positions 0-1), HL=true (multiple), LH=true (position 2-3), LL=false
- Direction: UP (hasHH OR hasHL)
- Confidence: upCount=3, total=5, ratio=0.6, boost=1.2 → 72%
- Intensity: HIGH (72% >= 50%)
- Display: **↑↑ 72%**

### Scenario 2: Weak Downtrend

**Price Sequence:**
```
T0: 100.00 (initial)
T1: 99.95 (-0.05%) → Movement: DOWN, Cache: [DOWN]
T2: 99.90 (-0.05%) → Movement: DOWN, Cache: [DOWN, DOWN]
T3: 99.92 (+0.02%) → Movement: FLAT (not recorded)
T4: 99.88 (-0.04%) → Movement: FLAT (not recorded)
T5: 99.85 (-0.03%) → Movement: FLAT (not recorded)
```

**Analysis at T5:**
- Cache: [DOWN, DOWN]
- Patterns: HH=false, HL=false, LH=false, LL=true (positions 0-1)
- Direction: DOWN (hasLL)
- Confidence: downCount=2, total=2, ratio=1.0, no boost → 100%
- Intensity: HIGH (100% >= 50%)
- Display: **↓↓ 100%**

### Scenario 3: Sideways/Neutral

**Price Sequence:**
```
T0: 100.00 (initial)
T1: 100.02 (+0.02%) → Movement: UP, Cache: [UP]
T2: 99.98 (-0.04%) → Movement: DOWN, Cache: [UP, DOWN]
T3: 100.01 (+0.03%) → Movement: UP, Cache: [UP, DOWN, UP]
T4: 99.99 (-0.02%) → Movement: DOWN, Cache: [UP, DOWN, UP, DOWN]
T5: 100.00 (+0.01%) → Movement: FLAT (not recorded)
```

**Analysis at T5:**
- Cache: [UP, DOWN, UP, DOWN]
- Patterns: HH=false, HL=true (multiple), LH=true (multiple), LL=false
- Direction: UP (hasHL) - but weak
- Confidence: upCount=2, total=4, ratio=0.5, no boost → 50%
- Intensity: HIGH (50% >= 50%)
- Display: **↑↑ 50%**

### Scenario 4: Reversal Pattern

**Price Sequence:**
```
T0: 100.00 (initial)
T1: 100.10 (+0.10%) → Movement: UP, Cache: [UP]
T2: 100.20 (+0.10%) → Movement: UP, Cache: [UP, UP]
T3: 100.15 (-0.05%) → Movement: DOWN, Cache: [UP, UP, DOWN]
T4: 100.05 (-0.10%) → Movement: DOWN, Cache: [UP, UP, DOWN, DOWN]
T5: 99.95 (-0.10%) → Movement: DOWN, Cache: [UP, UP, DOWN, DOWN, DOWN]
```

**Analysis at T5:**
- Patterns: HH=true (positions 0-1), HL=true (position 1-2), LH=false, LL=true (positions 3-4)
- Direction: DOWN (hasLL) - recent pattern overrides
- Confidence: downCount=3, total=5, ratio=0.6, boost=1.2 → 72%
- Intensity: HIGH (72% >= 50%)
- Display: **↓↓ 72%**

---

## Key Implementation Details

### Minimum Change Threshold

- Default: `0.01%` (configurable via `minChangePercent` parameter)
- Movements below this threshold are considered FLAT and not recorded
- This filters out noise from minor price fluctuations

### Movement Cache Size

- Fixed at 5 movements
- Provides enough history to detect patterns while remaining responsive
- Older movements are automatically discarded (FIFO)

### Smoothing Logic

- When switching between UP and DOWN, uses a 2-movement history check
- Only updates direction if the last 2 movements agree
- Prevents rapid flickering between directions

### Special Cases

1. **First Movement**: Shows immediate direction with confidence based on change percentage
2. **No Valid Value**: Resets to NEUTRAL with 0% confidence
3. **Same Value**: Skips processing if price hasn't changed

---

## Visual Display

The LTP cell displays:

```
┌─────────────────┐
│  [↑↑ 72%]       │  ← Bubble (oval, colored)
│                 │
│  100.35         │  ← LTP Value (main content)
└─────────────────┘
```

**Bubble States:**
- **UP + HIGH**: Green bubble, ↑↑, confidence%
- **UP + SLOW**: Green bubble, ↑, confidence%
- **DOWN + HIGH**: Red bubble, ↓↓, confidence%
- **DOWN + SLOW**: Red bubble, ↓, confidence%
- **NEUTRAL**: Gray bubble, →, — (or 0%)

---

## Code Location

- **Hook**: `frontend/dashboard-ui/src/hooks/useDirectionFlow.js`
- **Component**: `frontend/dashboard-ui/src/components/common/LTPCell.jsx`
- **Usage**: Called for each LTP cell in Futures and Options tables

---

## Configuration

Currently hardcoded:
- `minChangePercent = 0.01` (0.01% minimum change to record movement)
- `movementCacheSize = 5` (last 5 movements)
- `intensityThreshold = 50%` (confidence) or `0.5%` (recent change)

These could be made configurable via settings if needed.



