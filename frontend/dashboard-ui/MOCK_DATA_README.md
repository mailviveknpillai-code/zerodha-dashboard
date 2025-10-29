# Mock Data for UI Testing

This dashboard includes a comprehensive mock data system that allows you to test the UI without requiring backend API connectivity or real market data.

## Quick Start

### Option 1: URL Parameter (Easiest)
Simply add `?mock=true` to your URL:
```
http://localhost:5173/?mock=true
```

### Option 2: Environment Variable
Create a `.env` file in `frontend/dashboard-ui/` directory:
```env
VITE_USE_MOCK_DATA=true
```

## Features

The mock data generator provides:

- **Realistic Market Data**: Generates derivatives data including:
  - Futures contracts with multiple expiry dates
  - Call and Put options across multiple strike prices
  - Open Interest (OI), Volume, and Price data
  - Bid/Ask spreads with realistic spreads
  - Intrinsic and Time Value calculations

- **Dynamic Updates**: Prices update every 2 seconds with slight variations to simulate live market data

- **Multiple Underlyings**: Supports testing with different underlying assets (NIFTY, BANKNIFTY, etc.)

- **Strike Price Monitoring**: Includes mock PCR (Put-Call Ratio) data and max pain calculations

## Usage

### Testing Components

1. **Start the dev server** (if not running):
```bash
cd frontend/dashboard-ui
npm run dev
```

2. **Enable mock mode** by adding `?mock=true` to the URL

3. **View the dashboard** - it will be populated with realistic mock data

### Console Indicators

When mock mode is enabled, you'll see:
- `🎭 Mock Data Mode: ENABLED` in the console
- `🎭 [MOCK]` prefix on all API calls

### Mock Data Structure

The mock data includes:

```javascript
{
  underlying: 'NIFTY',
  spotPrice: 22500,
  expiryDates: ['2024-01-11', '2024-01-18', ...],
  futures: [
    {
      symbol: 'NIFTYFUT20240111',
      expiryDate: '2024-01-11',
      price: 22505.50,
      openInterest: 1250000,
      volume: 50000,
      change: 0.25,
      // ... more fields
    }
  ],
  callOptions: [/* multiple strike prices */],
  putOptions: [/* multiple strike prices */],
  dataSource: 'MOCK'
}
```

### Customizing Mock Data

To customize the generated data, edit `src/api/mockData.js`:

#### Change Default Underlying
```javascript
generateMockDerivatives('BANKNIFTY', 45000)
```

#### Adjust Price Variations
```javascript
// In mockClient.js, modify the getCurrentSpotPrice function:
currentSpotPrice = currentSpotPrice + (Math.random() * 10 - 5); // ±5 variance
```

#### Change Update Frequency
```javascript
// In mockData.js, modify the startMockUpdates function:
mockUpdateInterval = setInterval(update, 1000); // Update every second
```

## Files

- `src/api/mockData.js` - Mock data generators
- `src/api/mockClient.js` - Mock API client wrapper
- `src/api/client.js` - Main API client (automatically switches between real/mock)

## Switching Between Real and Mock Data

### Real Data (Default)
```
http://localhost:5173/
```
or
```env
VITE_USE_MOCK_DATA=false
```

### Mock Data
```
http://localhost:5173/?mock=true
```
or
```env
VITE_USE_MOCK_DATA=true
```

## Benefits

✅ **No Backend Required** - Test UI without running Java backend
✅ **No API Keys Needed** - No Zerodha/Breeze API credentials required
✅ **Consistent Data** - Same data structure every time for reliable testing
✅ **Fast Development** - Instant data loading without network delays
✅ **Realistic Behavior** - Prices update like real market data
✅ **Error-Free** - No network errors or API failures

## Examples

### Test Derivatives Dashboard
```bash
# Open browser to:
http://localhost:5173/?mock=true
```
You'll see a fully populated derivatives dashboard with:
- 4 future expiry dates
- 40 strike prices each for Calls and Puts
- All price data, OI, volume metrics
- Auto-updating prices every 2 seconds

### Test Specific Components
All components that use the API client will automatically use mock data when enabled:
- `DerivativesDashboard`
- `DerivativesTable`
- `FuturesTable`
- `OptionsTable`
- `StrikePriceMonitoring`
- `MarketSummary`

## Troubleshooting

### Mock mode not working?
1. Check browser console for `🎭 Mock Data Mode: ENABLED`
2. Verify URL has `?mock=true` parameter
3. Check `.env` file has `VITE_USE_MOCK_DATA=true`
4. Restart dev server after changing `.env` file

### Want to add more realistic data?
Edit `src/api/mockData.js` to:
- Add more expiry dates
- Add more strike prices
- Adjust price ranges
- Modify volume/OI calculations

## Development Notes

- Mock data is generated on-the-fly, not stored
- Prices maintain consistency within a session
- Each page reload generates fresh data
- Mock mode works in all browsers
- No backend connection is made when mock mode is enabled

