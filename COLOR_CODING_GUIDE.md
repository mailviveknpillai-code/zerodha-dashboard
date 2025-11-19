# Zerodha Dashboard - Color Coding Guide

## Overview
This document describes all color coding palettes used in the dashboard to indicate data movements, trends, and states. Colors are applied to table cells based on percentage changes from previous values.

---

## 1. DATA MOVEMENT COLOR CODING

### Green Palette (Upward Movements)
Used when values increase compared to the previous reading.

#### Light Mode Colors:
- **Very Soft** (`#93f5ab`): Smallest upward movement
- **Soft** (`#72f292`): Small upward movement
- **Medium** (`#30ed5f`): Moderate upward movement
- **Strong** (`#11c53e`): Large upward movement
- **Very Strong** (`#0b8329`): Largest upward movement

#### Dark Mode Colors:
- **Very Soft** (`#72f292`): Smallest upward movement
- **Soft** (`#51ef79`): Small upward movement
- **Medium** (`#13e548`): Moderate upward movement
- **Strong** (`#0ea433`): Large upward movement
- **Very Strong** (`#08621f`): Largest upward movement

### Red Palette (Downward Movements)
Used when values decrease compared to the previous reading.

#### Light Mode Colors:
- **Very Soft** (`#f69292`): Smallest downward movement
- **Soft** (`#f47070`): Small downward movement
- **Medium** (`#ee2e2e`): Moderate downward movement
- **Strong** (`#c60f0f`): Large downward movement
- **Very Strong** (`#840a0a`): Largest downward movement

#### Dark Mode Colors:
- **Very Soft** (`#f47070`): Smallest downward movement
- **Soft** (`#f14f4f`): Small downward movement
- **Medium** (`#e71111`): Moderate downward movement
- **Strong** (`#a50c0c`): Large downward movement
- **Very Strong** (`#630707`): Largest downward movement

---

## 2. INTENSITY LEVEL CONDITIONS

Intensity levels are determined by the absolute percentage change from the previous value. Each field type has specific thresholds:

### LTP (Last Traded Price)
- **Very Soft**: 0% to 0.2% change
- **Soft**: 0.2% to 0.8% change
- **Medium**: 0.8% to 1.6% change
- **Strong**: 1.6% to 2.4% change (1.6 × 1.5)
- **Very Strong**: ≥ 2.4% change
- **Minimum Denominator**: 1 (absolute value)

### Change (Price Change)
- **Very Soft**: 0% to 0.2% change
- **Soft**: 0.2% to 0.8% change
- **Medium**: 0.8% to 1.6% change
- **Strong**: 1.6% to 2.4% change (1.6 × 1.5)
- **Very Strong**: ≥ 2.4% change
- **Minimum Denominator**: 1 (absolute value)

### Change Percent (% Change)
- **Very Soft**: 0% to 0.4% change
- **Soft**: 0.4% to 1.2% change
- **Medium**: 1.2% to 2.5% change
- **Strong**: 2.5% to 3.75% change (2.5 × 1.5)
- **Very Strong**: ≥ 3.75% change
- **Minimum Denominator**: 0.25 (absolute value)

### OI (Open Interest)
- **Very Soft**: 0% to 1.5% change
- **Soft**: 1.5% to 4% change
- **Medium**: 4% to 9% change
- **Strong**: 9% to 13.5% change (9 × 1.5)
- **Very Strong**: ≥ 13.5% change
- **Minimum Denominator**: 500 (absolute value)
- **Note**: Delta OI column uses the same color coding as OI column

### Vol (Volume)
- **Very Soft**: 0% to 2% change
- **Soft**: 2% to 6% change
- **Medium**: 6% to 15% change
- **Strong**: 15% to 22.5% change (15 × 1.5)
- **Very Strong**: ≥ 22.5% change
- **Minimum Denominator**: 400 (absolute value)

### Bid (Best Bid Price)
- **Very Soft**: 0% to 0.25% change
- **Soft**: 0.25% to 0.9% change
- **Medium**: 0.9% to 1.8% change
- **Strong**: 1.8% to 2.7% change (1.8 × 1.5)
- **Very Strong**: ≥ 2.7% change
- **Minimum Denominator**: 1 (absolute value)

### Ask (Best Ask Price)
- **Very Soft**: 0% to 0.25% change
- **Soft**: 0.25% to 0.9% change
- **Medium**: 0.9% to 1.8% change
- **Strong**: 1.8% to 2.7% change (1.8 × 1.5)
- **Very Strong**: ≥ 2.7% change
- **Minimum Denominator**: 1 (absolute value)

### Bid Qty (Best Bid Quantity)
- **Very Soft**: 0% to 12% change
- **Soft**: 12% to 35% change
- **Medium**: 35% to 80% change
- **Strong**: 80% to 120% change (80 × 1.5)
- **Very Strong**: ≥ 120% change
- **Minimum Denominator**: 50 (absolute value)

### Ask Qty (Best Ask Quantity)
- **Very Soft**: 0% to 12% change
- **Soft**: 12% to 35% change
- **Medium**: 35% to 80% change
- **Strong**: 80% to 120% change (80 × 1.5)
- **Very Strong**: ≥ 120% change
- **Minimum Denominator**: 50 (absolute value)

---

## 3. HALO EFFECTS (Day High/Low Indicators)

Halo effects are applied when a value reaches its day high or day low.

### Day High (Maximum Value)
- **Color**: Green border (`#11c53e`)
- **Class**: `cell-halo-max`
- **Condition**: Current value ≥ Day High value
- **Visual**: Inset box-shadow with green border

### Day Low (Minimum Value)
- **Color**: Red border (`#c60f0f`)
- **Class**: `cell-halo-min`
- **Condition**: Current value ≤ Day Low value
- **Visual**: Inset box-shadow with red border

---

## 4. TABLE BORDER HALO EFFECTS

### Regular Table Halo Border
- **Class**: `table-halo-border`
- **Colors**: 
  - Blue: `rgba(59, 130, 246, 0.15)` with 8px blur
  - Purple: `rgba(168, 85, 247, 0.15)` with 12px blur
- **Applied to**: All tables on main page (except NIFTY DERIVATIVES)
- **Mode**: Light mode only

### Enhanced Table Halo Border (NIFTY DERIVATIVES)
- **Class**: `table-halo-border-strong`
- **Colors**: 
  - Blue: `rgba(59, 130, 246, 0.35)` with 8px blur (20% more visible)
  - Purple: `rgba(168, 85, 247, 0.35)` with 12px blur (20% more visible)
- **Applied to**: NIFTY DERIVATIVES table only
- **Mode**: Light mode only

---

## 5. BADGE COLORS (Contract Type Indicators)

### Call Options
- **Base Call**: `rgba(253, 224, 71, 0.25)` background, `#854d0e` text
- **Call ITM**: `rgba(202, 138, 4, 0.28)` background, `#78350f` text
- **Call ATM**: `rgba(250, 204, 21, 0.22)` background, `#854d0e` text
- **Call OTM**: `rgba(253, 224, 71, 0.15)` background, `#a16207` text

### Put Options
- **Base Put**: `rgba(96, 165, 250, 0.25)` background, `#1d4ed8` text
- **Put ITM**: `rgba(29, 78, 216, 0.32)` background, `#eff6ff` text
- **Put ATM**: `rgba(59, 130, 246, 0.24)` background, `#1e3a8a` text
- **Put OTM**: `rgba(191, 219, 254, 0.18)` background, `#1e40af` text

### Neutral
- **Background**: `rgba(203, 213, 225, 0.35)`
- **Text**: `#475569`

---

## 6. TEXT COLORS (Price Display)

### Price Up (Positive Change)
- **Color**: `#059669` (green)
- **Weight**: 700 (bold)
- **Shadow**: `0 1px 2px rgba(5, 150, 105, 0.2)`

### Price Down (Negative Change)
- **Color**: `#dc2626` (red)
- **Weight**: 700 (bold)
- **Shadow**: `0 1px 2px rgba(220, 38, 38, 0.2)`

### Price Neutral (No Change)
- **Color**: `#374151` (gray)
- **Weight**: 600 (semi-bold)

---

## 7. MARKET TREND INDICATOR COLORS

### Bullish
- **Color**: `#00C853` (green)
- **Icon**: 🟢
- **Condition**: Trend Score ≥ +3

### Bearish
- **Color**: `#D50000` (red)
- **Icon**: 🔴
- **Condition**: Trend Score ≤ -3

### Neutral
- **Color**: `#BDBDBD` (gray)
- **Icon**: ⚪
- **Condition**: Trend Score between -3 and +3

---

## 8. CALCULATION METHOD

### Percentage Change Formula
```
Percent Change = ((Current Value - Previous Value) / Denominator) × 100
```

Where:
- **Denominator** = max(|Previous Value|, Minimum Denominator)
- **Minimum Denominator** = Field-specific value (see thresholds above)

### Example Calculation
For LTP:
- Previous: 25000
- Current: 25100
- Minimum Denominator: 1
- Denominator: max(|25000|, 1) = 25000
- Percent Change: ((25100 - 25000) / 25000) × 100 = 0.4%
- **Result**: Soft Green (0.2% < 0.4% < 0.8%)

---

## 9. NOTES

1. **Color Persistence**: Colors persist until the value changes again or the cell is cleared from cache.

2. **Cache Management**: 
   - Default cache size: 120 contracts
   - Minimum: 50 contracts
   - Maximum: 240 contracts
   - Uses LRU (Least Recently Used) eviction

3. **Delta OI Special Handling**:
   - Delta OI only updates when the OI value actually changes
   - If OI remains the same, Delta OI retains its previous value (not reset to 0)
   - Uses the same color coding as the OI column

4. **No Color**: 
   - Cells show no background color when:
     - No previous value exists (first appearance)
     - Percent change is exactly 0%
     - Value is null or undefined

5. **Halo Effects Priority**:
   - Halo effects (day high/low) are applied in addition to movement colors
   - Both can be visible simultaneously

---

## 10. QUICK REFERENCE TABLE

| Field | Very Soft | Soft | Medium | Strong | Very Strong |
|-------|-----------|------|--------|--------|-------------|
| LTP | 0-0.2% | 0.2-0.8% | 0.8-1.6% | 1.6-2.4% | ≥2.4% |
| Change | 0-0.2% | 0.2-0.8% | 0.8-1.6% | 1.6-2.4% | ≥2.4% |
| Change% | 0-0.4% | 0.4-1.2% | 1.2-2.5% | 2.5-3.75% | ≥3.75% |
| OI | 0-1.5% | 1.5-4% | 4-9% | 9-13.5% | ≥13.5% |
| Vol | 0-2% | 2-6% | 6-15% | 15-22.5% | ≥22.5% |
| Bid | 0-0.25% | 0.25-0.9% | 0.9-1.8% | 1.8-2.7% | ≥2.7% |
| Ask | 0-0.25% | 0.25-0.9% | 0.9-1.8% | 1.8-2.7% | ≥2.7% |
| Bid Qty | 0-12% | 12-35% | 35-80% | 80-120% | ≥120% |
| Ask Qty | 0-12% | 12-35% | 35-80% | 80-120% | ≥120% |

---

**Last Updated**: Based on current implementation
**Version**: 1.0


