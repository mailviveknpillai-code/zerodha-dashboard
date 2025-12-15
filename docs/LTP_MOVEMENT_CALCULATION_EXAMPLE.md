# LTP Movement Calculation - Low Confidence Examples

## What is Low Confidence?

**Low Confidence** occurs when:
1. **Single Movement**: Only 1 movement detected with small change (< 0.25%)
2. **Mixed Movements**: Conflicting UP/DOWN movements without clear pattern
3. **Weak Pattern**: Pattern detected but with low ratio of directional movements

---

## Example 1: Single Small Movement (Very Low Confidence)

### Scenario: Single UP movement with small change

**Window: 0-5 seconds**

| Time | Current LTP | Previous LTP | Change | Change % | Movement | Cache | Direction | Confidence | Intensity |
|------|-------------|--------------|--------|----------|----------|-------|-----------|------------|-----------|
| 0s   | ₹25,000     | null         | -      | -        | -        | []    | NEUTRAL   | 0%         | SLOW      |
| 1s   | ₹25,010     | ₹25,000      | +₹10   | +0.04%   | FLAT*    | []    | NEUTRAL   | 0%         | SLOW      |
| 2s   | ₹25,015     | ₹25,010      | +₹5    | +0.02%   | FLAT*    | []    | NEUTRAL   | 0%         | SLOW      |
| 3s   | ₹25,025     | ₹25,015      | +₹10   | +0.04%   | FLAT*    | []    | NEUTRAL   | 0%         | SLOW      |
| 4s   | ₹25,030     | ₹25,025      | +₹5    | +0.02%   | FLAT*    | []    | NEUTRAL   | 0%         | SLOW      |
| 5s   | ₹25,040     | ₹25,030      | +₹10   | +0.04%   | FLAT*    | []    | NEUTRAL   | 0%         | SLOW      |

**Result**: NEUTRAL, 0%, SLOW (no movements ≥ 0.05% threshold)

---

## Example 2: Single Movement with Minimal Change (Low Confidence)

### Scenario: One UP movement just above threshold

**Window: 0-5 seconds**

| Time | Current LTP | Previous LTP | Change | Change % | Movement | Cache | Direction | Confidence | Intensity |
|------|-------------|--------------|--------|----------|----------|-------|-----------|------------|-----------|
| 0s   | ₹25,000     | null         | -      | -        | -        | []    | NEUTRAL   | 0%         | SLOW      |
| 1s   | ₹25,013     | ₹25,000      | +₹13   | +0.052%  | **UP**   | [UP]  | UP        | **1%**     | **SLOW**  |
| 2s   | ₹25,013     | ₹25,013      | ₹0     | 0%       | FLAT     | [UP]  | UP        | 1%         | SLOW      |
| 3s   | ₹25,012     | ₹25,013      | -₹1    | -0.004%  | FLAT*    | [UP]  | UP        | 1%         | SLOW      |
| 4s   | ₹25,012     | ₹25,012      | ₹0     | 0%       | FLAT     | [UP]  | UP        | 1%         | SLOW      |
| **5s** | **Window completes** | | | | | | **UP** | **1%** | **SLOW** |

**Calculation:**
- Only 1 movement detected
- Change: 0.052%
- Confidence = `min(100, max(1, 0.052 * 2))` = `min(100, max(1, 0.104))` = **1%**
- Intensity = SLOW (confidence < 50% AND change < 0.5%)

**Result**: UP, **1%**, SLOW (very low confidence - single weak movement)

---

## Example 3: Mixed Movements (Low Confidence)

### Scenario: Conflicting movements without clear pattern

**Window: 0-5 seconds**

| Time | Current LTP | Previous LTP | Change | Change % | Movement | Cache | Direction | Confidence | Intensity |
|------|-------------|--------------|--------|----------|----------|-------|-----------|------------|-----------|
| 0s   | ₹25,000     | null         | -      | -        | -        | []    | NEUTRAL   | 0%         | SLOW      |
| 1s   | ₹25,020     | ₹25,000      | +₹20   | +0.08%   | **UP**   | [UP]  | UP        | 2%         | SLOW      |
| 2s   | ₹25,005     | ₹25,020      | -₹15   | -0.06%   | **DOWN** | [UP, DOWN] | **NEUTRAL** | **0%** | **SLOW** |
| 3s   | ₹25,025     | ₹25,005      | +₹20   | +0.08%   | **UP**   | [UP, DOWN, UP] | **UP (HL)** | **33%** | **SLOW** |
| 4s   | ₹24,995     | ₹25,025      | -₹30   | -0.12%   | **DOWN** | [UP, DOWN, UP, DOWN] | **NEUTRAL** | **0%** | **SLOW** |
| **5s** | **Window completes** | | | | | | **NEUTRAL** | **0%** | **SLOW** |

**Calculation:**
- Movements: [UP, DOWN, UP, DOWN]
- Patterns: HL (Higher Low) detected, but also conflicting movements
- UP movements: 2 out of 4 = 50%
- DOWN movements: 2 out of 4 = 50%
- **No clear direction** → NEUTRAL, 0%, SLOW

**Result**: NEUTRAL, **0%**, SLOW (low confidence - conflicting signals)

---

## Example 4: Weak Pattern (Low-Medium Confidence)

### Scenario: Pattern detected but with low ratio

**Window: 0-5 seconds**

| Time | Current LTP | Previous LTP | Change | Change % | Movement | Cache | Direction | Confidence | Intensity |
|------|-------------|--------------|--------|----------|----------|-------|-----------|------------|-----------|
| 0s   | ₹25,000     | null         | -      | -        | -        | []    | NEUTRAL   | 0%         | SLOW      |
| 1s   | ₹25,020     | ₹25,000      | +₹20   | +0.08%   | **UP**   | [UP]  | UP        | 2%         | SLOW      |
| 2s   | ₹25,015     | ₹25,020      | -₹5    | -0.02%   | FLAT*    | [UP]  | UP        | 2%         | SLOW      |
| 3s   | ₹25,010     | ₹25,015      | -₹5    | -0.02%   | FLAT*    | [UP]  | UP        | 2%         | SLOW      |
| 4s   | ₹25,030     | ₹25,010      | +₹20   | +0.08%   | **UP**   | [UP, UP] | **UP (HH)** | **100%** | **HIGH** |
| **5s** | **Window completes** | | | | | | **UP** | **100%** | **HIGH** |

**Wait, this shows HIGH confidence. Let me show a better example:**

---

## Example 5: Weak Pattern with Mixed Signals (Low Confidence)

### Scenario: Pattern detected but with many conflicting movements

**Window: 0-5 seconds**

| Time | Current LTP | Previous LTP | Change | Change % | Movement | Cache | Direction | Confidence | Intensity |
|------|-------------|--------------|--------|----------|----------|-------|-----------|------------|-----------|
| 0s   | ₹25,000     | null         | -      | -        | -        | []    | NEUTRAL   | 0%         | SLOW      |
| 1s   | ₹25,020     | ₹25,000      | +₹20   | +0.08%   | **UP**   | [UP]  | UP        | 2%         | SLOW      |
| 2s   | ₹25,005     | ₹25,020      | -₹15   | -0.06%   | **DOWN** | [UP, DOWN] | NEUTRAL | 0% | SLOW |
| 3s   | ₹25,025     | ₹25,005      | +₹20   | +0.08%   | **UP**   | [UP, DOWN, UP] | **UP (HL)** | **33%** | **SLOW** |
| 4s   | ₹24,995     | ₹25,025      | -₹30   | -0.12%   | **DOWN** | [UP, DOWN, UP, DOWN] | NEUTRAL | 0% | SLOW |
| 5s   | ₹25,015     | ₹24,995      | +₹20   | +0.08%   | **UP**   | [UP, DOWN, UP, DOWN, UP] | **UP (HL)** | **40%** | **SLOW** |

**At 5s (Window Completion):**
- Movements: [UP, DOWN, UP, DOWN, UP]
- Pattern: HL (Higher Low) detected
- UP movements: 3 out of 5 = 60%
- But also has DOWN movements = conflicting signals
- Confidence = 60% (but pattern is weak due to mixed signals)
- Intensity = SLOW (confidence < 50% threshold for HIGH)

**Result**: UP, **40%**, SLOW (low-medium confidence - weak pattern with mixed signals)

---

## Example 6: Very Low Confidence - Single Movement Edge Case

### Scenario: One movement just at threshold

**Window: 0-5 seconds**

| Time | Current LTP | Previous LTP | Change | Change % | Movement | Cache | Direction | Confidence | Intensity |
|------|-------------|--------------|--------|----------|----------|-------|-----------|------------|-----------|
| 0s   | ₹25,000     | null         | -      | -        | -        | []    | NEUTRAL   | 0%         | SLOW      |
| 1s   | ₹25,012.5   | ₹25,000      | +₹12.5 | +0.05%   | **UP**   | [UP]  | UP        | **1%**     | **SLOW**  |
| 2s-5s | No significant changes | | | | | | | | |

**Calculation:**
- Only 1 movement detected
- Change: Exactly 0.05% (at threshold)
- Confidence = `min(100, max(1, 0.05 * 2))` = `min(100, max(1, 0.1))` = **1%**
- Intensity = SLOW (confidence < 50% AND change < 0.5%)

**Result**: UP, **1%**, SLOW (very low confidence - minimal movement)

---

## Confidence Calculation Summary

### Single Movement
```
Confidence = min(100, max(1, changePercent × 2))
Minimum: 1% (even for tiny movements)
Maximum: 100% (if change ≥ 50%)
```

**Examples:**
- 0.05% change → 1% confidence
- 0.1% change → 2% confidence
- 0.25% change → 5% confidence
- 0.5% change → 10% confidence

### Multiple Movements
```
Confidence = (Direction movements / Total movements) × 100
If both patterns detected (HH+HL or LH+LL): Confidence × 1.2
```

**Examples:**
- 1 UP out of 3 movements → 33% confidence
- 2 UP out of 5 movements → 40% confidence
- 3 UP out of 5 movements → 60% confidence (but still SLOW if < 50%)
- 4 UP out of 5 movements → 80% confidence (HIGH)

---

## Low Confidence Characteristics

1. **Confidence < 50%**: Always results in SLOW intensity
2. **Single Movement**: Typically 1-5% confidence
3. **Mixed Signals**: Conflicting UP/DOWN movements
4. **Weak Patterns**: Pattern detected but low directional ratio
5. **Small Changes**: Movements just above 0.05% threshold

---

## Key Takeaways

- **Low Confidence (< 50%)** = SLOW intensity
- **High Confidence (≥ 50%)** = HIGH intensity
- **Single movement** = Very low confidence (1-2%)
- **Mixed movements** = Low confidence (0-40%)
- **Clear pattern** = High confidence (60-100%)
