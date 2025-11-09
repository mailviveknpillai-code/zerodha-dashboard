/**
 * Mock Data Generator for UI Testing
 * Generates realistic market data for testing UI components without backend
 */

// Generate random price within range
function randomPrice(base, variance) {
  return (base + (Math.random() * 2 - 1) * variance).toFixed(2);
}

// Generate random volume
function randomVolume() {
  return Math.floor(Math.random() * 1000000) + 10000;
}

// Generate random change percentage
function randomChange() {
  return ((Math.random() * 2 - 1) * 5).toFixed(2);
}

// Generate expiry dates (weekly, monthly expiries)
function generateExpiryDates(count = 4) {
  const dates = [];
  const today = new Date();
  today.setDate(today.getDate() + (4 - today.getDay())); // Next Thursday
  
  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + (i * 7));
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Generate strike prices around a center price
function generateStrikes(centerPrice, count = 20, step = 50) {
  const strikes = [];
  const start = centerPrice - (count / 2) * step;
  
  for (let i = 0; i < count; i++) {
    strikes.push(start + (i * step));
  }
  return strikes;
}

// Mock derivatives data generator
export function generateMockDerivatives(underlying = 'NIFTY', spotPrice = 22500) {
  const baseSpot = typeof spotPrice === 'number' ? spotPrice : 22500;
  const expiryDates = generateExpiryDates(4);
  const currentExpiry = expiryDates[0];
  
  // Generate futures data
  const futures = expiryDates.map((expiry, index) => {
    const premium = baseSpot * (1 + 0.0001 * (index + 1)); // Slight premium
    return {
      exchange: 'NFO',
      symbol: `${underlying}FUT${expiry.split('-')[0]}${expiry.split('-')[1]}${expiry.split('-')[2].slice(-2)}`,
      expiryDate: expiry,
      underlying: underlying,
      instrumentType: 'FUTIDX',
      strikePrice: 0,
      optionType: 'FUTIDX',
      price: parseFloat(randomPrice(premium, 10)),
      change: parseFloat(randomChange()),
      changePercent: parseFloat(randomChange()),
      lastTradedPrice: parseFloat(randomPrice(premium, 10)),
      lastTradedQuantity: randomVolume(),
      totalTradedQuantity: randomVolume(),
      openInterest: randomVolume(),
      openInterestChange: Math.floor(Math.random() * 50000 - 25000),
      openInterestChangePercent: parseFloat(randomChange()),
      lotSize: 50,
      tickSize: 0.05,
      premium: parseFloat(randomPrice(premium - baseSpot, 5)),
      volume: randomVolume(),
      bidPrice: parseFloat(randomPrice(premium, 8)),
      askPrice: parseFloat(randomPrice(premium, 8)),
      bidQty: Math.floor(Math.random() * 1000),
      askQty: Math.floor(Math.random() * 1000),
      lastTradeTime: new Date().toISOString(),
      timestamp: Date.now()
    };
  });

  // Generate options data
  const strikes = generateStrikes(baseSpot, 40, 50);
  const callOptions = [];
  const putOptions = [];

  expiryDates.forEach((expiry, expIndex) => {
    strikes.forEach((strike, strikeIndex) => {
      // Calculate option price based on Black-Scholes approximation
      const intrinsicValue = Math.max(0, baseSpot - strike);
      const timeValue = (1 / (expIndex + 1)) * (strike * 0.02);
      const optionPremium = intrinsicValue + timeValue;

      // Call options
      callOptions.push({
        exchange: 'NFO',
        symbol: `${underlying}${expiry.replace(/-/g, '')}C${strike}`,
        expiryDate: expiry,
        underlying: underlying,
        instrumentType: 'OPTIDX',
        strikePrice: strike,
        optionType: 'CALL',
        price: parseFloat(randomPrice(optionPremium, optionPremium * 0.1)),
        change: parseFloat(randomChange()),
        changePercent: parseFloat(randomChange()),
        lastTradedPrice: parseFloat(randomPrice(optionPremium, optionPremium * 0.1)),
        lastTradedQuantity: randomVolume(),
        totalTradedQuantity: randomVolume(),
        openInterest: randomVolume(),
        openInterestChange: Math.floor(Math.random() * 50000 - 25000),
        openInterestChangePercent: parseFloat(randomChange()),
        lotSize: 50,
        tickSize: 0.05,
        premium: parseFloat(randomPrice(optionPremium, optionPremium * 0.1)),
        volume: randomVolume(),
        bidPrice: parseFloat(randomPrice(optionPremium * 0.99, optionPremium * 0.05)),
        askPrice: parseFloat(randomPrice(optionPremium * 1.01, optionPremium * 0.05)),
        bidQty: Math.floor(Math.random() * 1000),
        askQty: Math.floor(Math.random() * 1000),
        intrinsicValue: intrinsicValue,
        timeValue: parseFloat((Math.random() * strike * 0.05).toFixed(2)),
        lastTradeTime: new Date().toISOString(),
        timestamp: Date.now()
      });

      // Put options
      const putIntrinsicValue = Math.max(0, strike - baseSpot);
      const putOptionPremium = putIntrinsicValue + timeValue;
      
      putOptions.push({
        exchange: 'NFO',
        symbol: `${underlying}${expiry.replace(/-/g, '')}P${strike}`,
        expiryDate: expiry,
        underlying: underlying,
        instrumentType: 'OPTIDX',
        strikePrice: strike,
        optionType: 'PUT',
        price: parseFloat(randomPrice(putOptionPremium, putOptionPremium * 0.1)),
        change: parseFloat(randomChange()),
        changePercent: parseFloat(randomChange()),
        lastTradedPrice: parseFloat(randomPrice(putOptionPremium, putOptionPremium * 0.1)),
        lastTradedQuantity: randomVolume(),
        totalTradedQuantity: randomVolume(),
        openInterest: randomVolume(),
        openInterestChange: Math.floor(Math.random() * 50000 - 25000),
        openInterestChangePercent: parseFloat(randomChange()),
        lotSize: 50,
        tickSize: 0.05,
        premium: parseFloat(randomPrice(putOptionPremium, putOptionPremium * 0.1)),
        volume: randomVolume(),
        bidPrice: parseFloat(randomPrice(putOptionPremium * 0.99, putOptionPremium * 0.05)),
        askPrice: parseFloat(randomPrice(putOptionPremium * 1.01, putOptionPremium * 0.05)),
        bidQty: Math.floor(Math.random() * 1000),
        askQty: Math.floor(Math.random() * 1000),
        intrinsicValue: putIntrinsicValue,
        timeValue: parseFloat((Math.random() * strike * 0.05).toFixed(2)),
        lastTradeTime: new Date().toISOString(),
        timestamp: Date.now()
      });
    });
  });

  return {
    underlying: underlying,
    spotPrice: parseFloat(baseSpot.toFixed(2)),
    dailyStrikePrice: parseFloat(randomPrice(baseSpot, 50)),
    expiryDates: expiryDates,
    futures: futures,
    callOptions: callOptions,
    putOptions: putOptions,
    totalContracts: futures.length + callOptions.length + putOptions.length,
    dataSource: 'MOCK',
    timestamp: Date.now(),
    lastUpdated: new Date().toISOString()
  };
}

// Mock strike price monitoring data
export function generateMockStrikeMonitoring(underlying = 'NIFTY', spotPrice = 22500) {
  const baseSpot = typeof spotPrice === 'number' ? spotPrice : 22500;
  const strikes = generateStrikes(baseSpot, 25, 50);
  
  return {
    underlying: underlying,
    spotPrice: parseFloat(baseSpot.toFixed(2)),
    strikeRange: {
      min: Math.min(...strikes),
      max: Math.max(...strikes)
    },
    strikes: strikes.map(strike => {
      const distance = Math.abs(strike - baseSpot);
      const distancePercent = (distance / baseSpot * 100).toFixed(2);
      
      return {
        strikePrice: strike,
        callOI: randomVolume(),
        putOI: randomVolume(),
        callPremium: parseFloat(randomPrice(Math.max(0, baseSpot - strike) * 0.01, 10)),
        putPremium: parseFloat(randomPrice(Math.max(0, strike - baseSpot) * 0.01, 10)),
        maxPain: Math.abs(strike - baseSpot) < 200, // Closer to ATM
        distance: parseFloat(distance.toFixed(2)),
        distancePercent: parseFloat(distancePercent),
        pcrRatio: parseFloat((Math.random() * 0.5 + 0.5).toFixed(3)), // 0.5 to 1.0
        timestamp: Date.now()
      };
    }),
    maxPainStrike: strikes.find(s => Math.abs(s - baseSpot) < 100),
    totalCallOI: randomVolume() * 10,
    totalPutOI: randomVolume() * 10,
    overallPCR: parseFloat((Math.random() * 0.5 + 0.5).toFixed(3)),
    dataSource: 'MOCK',
    timestamp: Date.now(),
    lastUpdated: new Date().toISOString()
  };
}

// Mock stock data
export function generateMockStock(symbol = 'NIFTY') {
  const basePrice = 22500 + (Math.random() * 1000 - 500);
  
  return {
    symbol: symbol,
    companyName: `${symbol} Index`,
    exchange: 'NSE',
    price: parseFloat(randomPrice(basePrice, 100)),
    change: parseFloat(randomChange()),
    changePercent: parseFloat(randomChange()),
    open: parseFloat(randomPrice(basePrice, 200)),
    high: parseFloat(randomPrice(basePrice + 100, 100)),
    low: parseFloat(randomPrice(basePrice - 100, 100)),
    close: parseFloat(randomPrice(basePrice, 100)),
    volume: randomVolume(),
    turnover: parseFloat((randomVolume() * basePrice / 100000).toFixed(2)),
    previousClose: parseFloat(randomPrice(basePrice, 100)),
    yearHigh: parseFloat(randomPrice(basePrice + 1000, 200)),
    yearLow: parseFloat(randomPrice(basePrice - 1000, 200)),
    timestamp: Date.now(),
    dataSource: 'MOCK'
  };
}

// Auto-updating mock data with slight price movements
let mockUpdateInterval = null;
const subscribers = new Set();

export function startMockUpdates(callback, underlying = 'NIFTY') {
  const update = () => {
    const currentSpot = 22500 + (Math.random() * 500 - 250);
    const derivatives = generateMockDerivatives(underlying, currentSpot);
    const strikeMonitoring = generateMockStrikeMonitoring(underlying, currentSpot);
    
    callback({
      derivatives,
      strikeMonitoring,
      stock: generateMockStock(underlying)
    });
  };

  // Initial update
  update();
  
  // Update every 2 seconds
  mockUpdateInterval = setInterval(update, 2000);
  
  return () => {
    if (mockUpdateInterval) {
      clearInterval(mockUpdateInterval);
      mockUpdateInterval = null;
    }
  };
}

export function stopMockUpdates() {
  if (mockUpdateInterval) {
    clearInterval(mockUpdateInterval);
    mockUpdateInterval = null;
  }
}

// Subscribe to mock updates
export function subscribeToMockUpdates(subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

// Export all generators
export const mockDataGenerator = {
  derivatives: generateMockDerivatives,
  strikeMonitoring: generateMockStrikeMonitoring,
  stock: generateMockStock,
  startUpdates: startMockUpdates,
  stopUpdates: stopMockUpdates
};

