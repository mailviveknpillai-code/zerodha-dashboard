# Price Movement Tracking with Color-Coded Halo

## Overview
Added visual tracking for price movements using color-coded cell borders that change based on price movement relative to starting value.

## Implementation Status
✅ CSS styles added to `frontend/dashboard-ui/src/index.css`
✅ Hook created in `frontend/dashboard-ui/src/hooks/usePriceTracking.js`

## How It Works

### Color System:
- **Red (Downward Movement):**
  - Light red: -2% to 0% below starting value
  - Medium red: -5% to -2%
  - Dark red: -10% to -5% (with pulsing animation)
  - Intense red: Below -10% (bright pulsing animation)

- **Green (Upward Movement):**
  - Light green: 0% to 2% above starting value
  - Medium green: 2% to 5%
  - Dark green: 5% to 10% (with pulsing animation)
  - Intense green: Above 10% (bright pulsing animation)

### Starting Value:
Each row tracks its own starting value (first value when table loads)

## To Apply This to Tables:

### In FuturesTable.jsx or OptionsTable.jsx:

1. Import the helper function:
```javascript
import { getPriceTrackingClass } from '../hooks/usePriceTracking';
```

2. Track starting values per row (add at component level):
```javascript
const startingValuesRef = useRef(new Map());
```

3. Apply halo to LTP column:
```javascript
// For the LTP column
<td className={`py-3 px-4 data-cell ${
  getPriceTrackingClass(row.ltp, startingValuesRef.current.get(row.id), row.isHeader)
} ${getLTPColor(row.ltp, row.isHeader, row.isSubHeader)}`}>
  {row.ltp}
</td>
```

4. Update starting values when data loads:
```javascript
useEffect(() => {
  organizedRows.forEach(row => {
    if (!row.isHeader && row.ltp && !startingValuesRef.current.has(row.id)) {
      startingValuesRef.current.set(row.id, Number(row.ltp));
    }
  });
}, [organizedRows]);
```

## Next Steps to Complete Implementation:
1. Add unique IDs to each row in the data structure
2. Apply the tracking class to LTP columns
3. Test with mock data to see the halo effect
4. Optionally add a "Reset Tracking" button to reset starting values

## Additional Suggestions:

### 1. Sound Alerts (Optional)
Add audio cues for significant movements:
- Soft "beep" for -5% drops
- Louder alert for -10% drops

### 2. Quick Stats Panel
Show summary of:
- Rows with intense red/green
- Strongest upward/downward movements
- Trending direction indicator

### 3. Filter by Movement
Add buttons to filter:
- "Strong Upward" (intense green)
- "Strong Downward" (intense red)
- "Neutral" (light halo)

### 4. Historical Trend Line
Show mini sparkline showing price over last 10 updates

## Testing:
1. Open UI at http://localhost:5173
2. Watch LTP values change
3. Should see color-coded borders appear based on movement
4. Check that:
   - Red appears when price goes below starting value
   - Green appears when above
   - Intensity increases with bigger movements















