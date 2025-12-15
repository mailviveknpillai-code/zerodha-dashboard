# Trend Score Calculation Logic

## Overview

The Trend Score is a market sentiment indicator that calculates whether the market is **Bullish**, **Bearish**, or **Neutral** based on futures, call options, and put options data. It uses a **FIFO (First In First Out) stack** that stores the last N API-polled values (not time-based).

## Key Concepts

### 1. **FIFO Window (Not Time-Based)**
- The window size is the **number of API polls**, not seconds
- Example: If window size = 5 and API polls every 1 second, it keeps the last 5 API-polled values
- When a new API poll arrives, the oldest value is removed (FIFO)

### 2. **Three Segments**
- **Futures**: Direct market sentiment
- **Call Options**: Bullish sentiment indicator
- **Put Options**: Bearish sentiment indicator (inverse logic)

### 3. **Metrics Tracked**
For each segment (futures, calls, puts), the following metrics are tracked:
- **LTP** (Last Traded Price) - Weight: 1.0
- **Volume** - Weight: 0.7
- **Bid** - Weight: 0.7
- **Ask** - Weight: 0.3 (soft factor)
- **Bid Quantity** - Weight: 0.4
- **Ask Quantity** - Weight: 0.4

### 4. **Segment Weights**
- **Bullish Score**: 45% futures + 35% calls + 20% puts
- **Bearish Score**: 45% futures + 20% calls + 35% puts

### 5. **Thresholds**
- **Bullish Threshold**: Default 3.0 (configurable)
- **Bearish Threshold**: Default -3.0 (configurable)
- Score range: -10 to +10

## Step-by-Step Calculation Flow

### Step 1: Collect Metrics on Each API Poll

On every API poll, extract metrics from:
- First valid futures contract
- First valid call option contract
- First valid put option contract

**Example Metrics Snapshot:**
```
Futures: LTP=19500, Volume=1000, Bid=19499, Ask=19501, BidQty=5000, AskQty=3000
Calls:   LTP=150, Volume=500, Bid=149, Ask=151, BidQty=2000, AskQty=1500
Puts:    LTP=100, Volume=300, Bid=99, Ask=101, BidQty=1000, AskQty=2000
```

### Step 2: Add to FIFO Windows

Each snapshot is added to its respective FIFO window:
- **Futures Window**: Stores last N futures snapshots
- **Calls Window**: Stores last N calls snapshots
- **Puts Window**: Stores last N puts snapshots

**Example with Window Size = 5:**
```
Futures Window (FIFO):
  [Snapshot1, Snapshot2, Snapshot3, Snapshot4, Snapshot5] ← New poll added here
  Oldest ← → Newest

Calls Window (FIFO):
  [Snapshot1, Snapshot2, Snapshot3, Snapshot4, Snapshot5]

Puts Window (FIFO):
  [Snapshot1, Snapshot2, Snapshot3, Snapshot4, Snapshot5]
```

### Step 3: Calculate Segment Scores

For each segment, compare the **current (latest) snapshot** with the **average of all previous snapshots** in the window.

#### 3.1 Calculate Averages from Cache (Previous Snapshots)

**Example for Futures:**
```
Current Snapshot (Snapshot5):
  LTP=19500, Volume=1000, Bid=19499, Ask=19501, BidQty=5000, AskQty=3000

Cache Average (Snapshots 1-4):
  AvgLTP=19450, AvgVolume=800, AvgBid=19449, AvgAsk=19451, AvgBidQty=4000, AvgAskQty=3500
```

#### 3.2 Calculate Percent Deltas

```
ltpDelta = ((19500 - 19450) / 19450) * 100 = 0.257% ↑
volDelta = ((1000 - 800) / 800) * 100 = 25% ↑
bidDelta = ((19499 - 19449) / 19449) * 100 = 0.257% ↑
askDelta = ((19501 - 19451) / 19451) * 100 = 0.257% ↑
bidQtyDelta = ((5000 - 4000) / 4000) * 100 = 25% ↑
askQtyDelta = ((3000 - 3500) / 3500) * 100 = -14.3% ↓
```

#### 3.3 Determine Directions (Threshold: 0.1%)

```
ltpDir = 1 (up, because 0.257% > 0.1%)
volDir = 1 (up, because 25% > 0.1%)
bidDir = 1 (up, because 0.257% > 0.1%)
askDir = 1 (up, because 0.257% > 0.1%)
bidQtyDir = 1 (up, because 25% > 0.1%)
askQtyDir = -1 (down, because -14.3% < -0.1%)
```

#### 3.4 Calculate Segment Score

**For Futures and Calls (Bullish Logic):**
- **Bullish indicators** (add to score):
  - LTP↑ → +1.0
  - Volume↑ → +0.7
  - Bid↑ → +0.7
  - BidQty↑ → +0.4
  - AskQty↓ → +0.4
  - Ask↓ (soft) → +0.15 (0.3 * 0.5)

- **Bearish indicators** (subtract from score):
  - LTP↓ → -1.0
  - Volume↓ → -0.7
  - Bid↓ → -0.7
  - BidQty↓ → -0.4
  - AskQty↑ → -0.4
  - Ask↑ (soft) → score *= 0.85 (multiply by 0.85)

**Example Calculation:**
```
Futures Score:
  ltpDir = 1 → +1.0
  volDir = 1 → +0.7
  bidDir = 1 → +0.7
  bidQtyDir = 1 → +0.4
  askQtyDir = -1 → +0.4
  askDir = 1 → score *= 0.85 (soft bearish)
  
  Base Score = 1.0 + 0.7 + 0.7 + 0.4 + 0.4 = 3.2
  After Ask soft factor: 3.2 * 0.85 = 2.72
  
  Depth Ratio Check:
    bidQty / askQty = 5000 / 3000 = 1.67
    1.67 > 1.2 → +0.3 boost
  
  Final Futures Score = 2.72 + 0.3 = 3.02
```

**For Puts (Inverse Logic - Bullish Market = Puts Down):**
- **Bullish indicators** (add to score):
  - LTP↓ → +1.0 (puts going down = bullish)
  - Volume↓ → +0.7
  - Bid↓ → +0.7
  - BidQty↓ → +0.4
  - AskQty↑ → +0.4
  - Ask↑ (soft) → +0.15

- **Bearish indicators** (subtract from score):
  - LTP↑ → -1.0 (puts going up = bearish)
  - Volume↑ → -0.7
  - Bid↑ → -0.7
  - BidQty↑ → -0.4
  - AskQty↓ → -0.4
  - Ask↓ (soft) → score *= 0.85

**Example Calculation:**
```
Puts Snapshot:
  Current: LTP=100, Volume=300, Bid=99, Ask=101, BidQty=1000, AskQty=2000
  Cache Avg: LTP=110, Volume=400, Bid=109, Ask=111, BidQty=1500, AskQty=1800
  
  Deltas:
    ltpDelta = ((100 - 110) / 110) * 100 = -9.09% ↓ (bullish for puts)
    volDelta = ((300 - 400) / 400) * 100 = -25% ↓
    bidDelta = ((99 - 109) / 109) * 100 = -9.17% ↓
    askDelta = ((101 - 111) / 111) * 100 = -9.01% ↓
    bidQtyDelta = ((1000 - 1500) / 1500) * 100 = -33.3% ↓
    askQtyDelta = ((2000 - 1800) / 1800) * 100 = 11.1% ↑
  
  Directions:
    ltpDir = -1, volDir = -1, bidDir = -1, askDir = -1, bidQtyDir = -1, askQtyDir = 1
  
  Puts Score:
    ltpDir = -1 → +1.0 (puts down = bullish)
    volDir = -1 → +0.7
    bidDir = -1 → +0.7
    bidQtyDir = -1 → +0.4
    askQtyDir = 1 → +0.4
    askDir = -1 → score *= 0.85
    
    Base Score = 1.0 + 0.7 + 0.7 + 0.4 + 0.4 = 3.2
    After Ask soft factor: 3.2 * 0.85 = 2.72
    
    Depth Ratio Check:
      bidQty / askQty = 1000 / 2000 = 0.5
      0.5 < 0.8 → +0.3 boost (inverse for puts)
    
    Final Puts Score = 2.72 + 0.3 = 3.02
```

### Step 4: Calculate Combined Scores

**Bullish Score:**
```
Bullish Score = 0.45 * FuturesScore + 0.35 * CallsScore + 0.20 * PutsScore
```

**Bearish Score:**
```
Bearish Score = 0.45 * FuturesScore + 0.20 * CallsScore + 0.35 * PutsScore
```

**Example:**
```
Futures Score = 3.02
Calls Score = 2.5
Puts Score = 3.02

Bullish Score = 0.45 * 3.02 + 0.35 * 2.5 + 0.20 * 3.02
              = 1.359 + 0.875 + 0.604
              = 2.838

Bearish Score = 0.45 * 3.02 + 0.20 * 2.5 + 0.35 * 3.02
              = 1.359 + 0.5 + 1.057
              = 2.916
```

### Step 5: Normalize Scores

Normalize both scores to -10 to +10 range:
```
normalizedScore = (rawScore / maxPossible) * 10.0
```

Where `maxPossible = 5.0` (theoretical maximum raw score).

**Example:**
```
Normalized Bullish Score = (2.838 / 5.0) * 10.0 = 5.676
Normalized Bearish Score = (2.916 / 5.0) * 10.0 = 5.832
```

### Step 6: Determine Classification

**Rules:**
1. If **Bullish Score ≥ Bullish Threshold** (default 3.0) → **Bullish**
2. If **Bearish Score ≤ Bearish Threshold** (default -3.0) → **Bearish**
3. If both cross → Use the one with **higher absolute value**
4. If neither crosses → **Neutral** (use score with higher absolute value)

**Example:**
```
Normalized Bullish Score = 5.676
Normalized Bearish Score = 5.832
Bullish Threshold = 3.0
Bearish Threshold = -3.0

bullishCrossed = 5.676 >= 3.0 → TRUE
bearishCrossed = 5.832 <= -3.0 → FALSE

Since bullishCrossed = TRUE → Classification = "Bullish"
Final Score = 5.676
```

### Step 7: Apply Smoothing (Majority Rule)

Maintain a history of the last 3 classifications:
```
Classification History: [Bullish, Bullish, Neutral]
```

**Rules:**
- If history has 3 entries:
  - Count occurrences of each classification
  - If one classification appears **≥ 2 times** (majority), use that
  - Otherwise, use the current classification
- **Exception**: If threshold is crossed, always use current classification (no smoothing)

**Example:**
```
Current Classification: "Bullish"
History: [Bullish, Bullish, Neutral]

Counts:
  Bullish: 2
  Neutral: 1

Since Bullish appears 2 times (≥ 2), use "Bullish"
Final Classification = "Bullish"
```

**Example with No Majority:**
```
Current Classification: "Bullish"
History: [Bullish, Neutral, Bearish]

Counts:
  Bullish: 1
  Neutral: 1
  Bearish: 1

No majority (all have 1), use current classification
Final Classification = "Bullish"
```

## Complete Example Walkthrough

### Scenario: Window Size = 5, API Polls Every 1 Second

**Initial State (First 4 Polls):**
```
Futures Window: [S1, S2, S3, S4] (waiting for 5th)
Calls Window: [S1, S2, S3, S4]
Puts Window: [S1, S2, S3, S4]

Result: "Neutral" (not enough data)
```

**5th Poll Arrives:**
```
Futures Window: [S1, S2, S3, S4, S5] ← Full
Calls Window: [S1, S2, S3, S4, S5] ← Full
Puts Window: [S1, S2, S3, S4, S5] ← Full

Calculate:
  Current = S5
  Cache Avg = Average(S1, S2, S3, S4)
  
  Futures Score = 3.02
  Calls Score = 2.5
  Puts Score = 3.02
  
  Bullish Score = 0.45*3.02 + 0.35*2.5 + 0.20*3.02 = 2.838
  Bearish Score = 0.45*3.02 + 0.20*2.5 + 0.35*3.02 = 2.916
  
  Normalized Bullish = 5.676
  Normalized Bearish = 5.832
  
  Classification = "Bullish" (5.676 >= 3.0)
  Final Score = 5.676
```

**6th Poll Arrives:**
```
Futures Window: [S2, S3, S4, S5, S6] ← S1 removed (FIFO)
Calls Window: [S2, S3, S4, S5, S6]
Puts Window: [S2, S3, S4, S5, S6]

Calculate:
  Current = S6
  Cache Avg = Average(S2, S3, S4, S5)
  
  ... (same calculation process)
  
  Classification = "Bullish"
  History: [Bullish] (only 1 entry, no smoothing)
```

**7th Poll Arrives:**
```
Futures Window: [S3, S4, S5, S6, S7] ← S2 removed (FIFO)
...

Classification = "Bullish"
History: [Bullish, Bullish] (2 entries, no smoothing yet)
```

**8th Poll Arrives:**
```
Futures Window: [S4, S5, S6, S7, S8] ← S3 removed (FIFO)
...

Classification = "Neutral" (score didn't cross threshold)
History: [Bullish, Bullish, Neutral]

Smoothing:
  Counts: Bullish=2, Neutral=1
  Majority = "Bullish" (appears 2 times)
  Final Classification = "Bullish" (from majority)
```

## Important Notes

1. **Window Size is Number of API Polls, Not Time**
   - If API polls every 2 seconds and window size = 5, it keeps last 5 polls (10 seconds of data)
   - If API polls every 0.5 seconds and window size = 5, it keeps last 5 polls (2.5 seconds of data)

2. **Calculation Happens on Every API Poll**
   - The trend is recalculated every time new data arrives from the API
   - The UI displays the latest calculated trend at the UI refresh rate

3. **Smoothing Prevents Rapid Flipping**
   - The majority rule (2 out of 3) prevents the classification from flipping too quickly
   - However, if a threshold is crossed, smoothing is bypassed for immediate response

4. **Puts Use Inverse Logic**
   - For puts, bullish market = puts going down (LTP↓, Volume↓, etc.)
   - This is because puts are bearish instruments - when market is bullish, puts lose value

5. **Depth Ratio Boost**
   - If bidQty/askQty > 1.2 (more buyers) → +0.3 boost
   - If bidQty/askQty < 0.8 (more sellers) → -0.3 penalty
   - For puts, the logic is inverted

6. **Ask as Soft Factor**
   - Ask direction has less weight (0.3) and acts as a soft factor
   - Ask↑ reduces score by 15% (multiply by 0.85)
   - Ask↓ adds 0.15 to score (0.3 * 0.5)

## Configuration

- **Window Size**: Number of API polls to keep (default: 5)
- **Bullish Threshold**: Score threshold for bullish classification (default: 3.0)
- **Bearish Threshold**: Score threshold for bearish classification (default: -3.0)

These can be configured via the UI settings or API endpoints.





