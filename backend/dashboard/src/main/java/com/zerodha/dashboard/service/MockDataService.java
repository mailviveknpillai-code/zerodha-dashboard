package com.zerodha.dashboard.service;

import com.zerodha.dashboard.model.DerivativeContract;
import com.zerodha.dashboard.model.DerivativesChain;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class MockDataService {
    
    @Value("${mock.data.spot.price:25000}")
    private BigDecimal spotPrice;
    
    @Value("${mock.data.underlying:NIFTY}")
    private String underlying;
    
    private final Random random = new Random();
    
    public DerivativesChain generateMockDerivativesChain() {
        DerivativesChain chain = new DerivativesChain();
        chain.setUnderlying(underlying);
        chain.setSpotPrice(spotPrice);
        chain.setDailyStrikePrice(spotPrice);
        chain.setDataSource("MOCK_DATA");
        chain.setTimestamp(Instant.now());
        
        // Generate futures data
        chain.setFutures(generateMockFutures());
        
        // Generate options data
        chain.setCallOptions(generateMockCallOptions());
        chain.setPutOptions(generateMockPutOptions());
        
        return chain;
    }
    
    private List<DerivativeContract> generateMockFutures() {
        List<DerivativeContract> futures = new ArrayList<>();
        
        // Generate 2-3 futures contracts
        for (int i = 0; i < 3; i++) {
            DerivativeContract future = new DerivativeContract();
            future.setTradingsymbol(underlying + "24DEC" + (i + 1));
            future.setStrikePrice(spotPrice.add(BigDecimal.valueOf(random.nextInt(200) - 100)));
            future.setLastPrice(spotPrice.add(BigDecimal.valueOf(random.nextInt(300) - 150)));
            future.setChange(BigDecimal.valueOf(random.nextInt(200) - 100));
            future.setChangePercent(BigDecimal.valueOf(random.nextDouble() * 2 - 1));
            future.setVolume(random.nextInt(10000) + 1000);
            future.setOpenInterest(BigDecimal.valueOf(random.nextInt(50000) + 10000));
            future.setBid(future.getLastPrice().subtract(BigDecimal.valueOf(random.nextInt(10) + 1)));
            future.setAsk(future.getLastPrice().add(BigDecimal.valueOf(random.nextInt(10) + 1)));
            future.setBidQuantity((long) (random.nextInt(100) + 10));
            future.setAskQuantity((long) (random.nextInt(100) + 10));
            future.setExpiryDate(getNextExpiryDate());
            future.setInstrumentType("FUT");
            future.setUnderlying(underlying);
            future.setSegment("FUTURES");
            future.setTimestamp(Instant.now());
            
            futures.add(future);
        }
        
        return futures;
    }
    
    private List<DerivativeContract> generateMockCallOptions() {
        List<DerivativeContract> calls = new ArrayList<>();
        
        // Generate call options around spot price
        for (int i = -10; i <= 10; i++) {
            if (i == 0) continue; // Skip ATM for calls
            
            DerivativeContract call = new DerivativeContract();
            BigDecimal strikePrice = spotPrice.add(BigDecimal.valueOf(i * 50));
            
            call.setTradingsymbol(underlying + "24DEC" + strikePrice + "CE");
            call.setStrikePrice(strikePrice);
            call.setLastPrice(calculateOptionPrice(strikePrice, spotPrice, true));
            call.setChange(BigDecimal.valueOf(random.nextInt(20) - 10));
            call.setChangePercent(BigDecimal.valueOf(random.nextDouble() * 4 - 2));
            call.setVolume(random.nextInt(5000) + 500);
            call.setOpenInterest(BigDecimal.valueOf(random.nextInt(25000) + 5000));
            call.setBid(call.getLastPrice().subtract(BigDecimal.valueOf(random.nextInt(5) + 1)));
            call.setAsk(call.getLastPrice().add(BigDecimal.valueOf(random.nextInt(5) + 1)));
            call.setBidQuantity((long) (random.nextInt(50) + 5));
            call.setAskQuantity((long) (random.nextInt(50) + 5));
            call.setExpiryDate(getNextExpiryDate());
            call.setInstrumentType("CE");
            call.setUnderlying(underlying);
            call.setSegment("CALL_OPTIONS");
            call.setTimestamp(Instant.now());
            
            calls.add(call);
        }
        
        return calls;
    }
    
    private List<DerivativeContract> generateMockPutOptions() {
        List<DerivativeContract> puts = new ArrayList<>();
        
        // Generate put options around spot price
        for (int i = -10; i <= 10; i++) {
            if (i == 0) continue; // Skip ATM for puts
            
            DerivativeContract put = new DerivativeContract();
            BigDecimal strikePrice = spotPrice.add(BigDecimal.valueOf(i * 50));
            
            put.setTradingsymbol(underlying + "24DEC" + strikePrice + "PE");
            put.setStrikePrice(strikePrice);
            put.setLastPrice(calculateOptionPrice(strikePrice, spotPrice, false));
            put.setChange(BigDecimal.valueOf(random.nextInt(20) - 10));
            put.setChangePercent(BigDecimal.valueOf(random.nextDouble() * 4 - 2));
            put.setVolume(random.nextInt(5000) + 500);
            put.setOpenInterest(BigDecimal.valueOf(random.nextInt(25000) + 5000));
            put.setBid(put.getLastPrice().subtract(BigDecimal.valueOf(random.nextInt(5) + 1)));
            put.setAsk(put.getLastPrice().add(BigDecimal.valueOf(random.nextInt(5) + 1)));
            put.setBidQuantity((long) (random.nextInt(50) + 5));
            put.setAskQuantity((long) (random.nextInt(50) + 5));
            put.setExpiryDate(getNextExpiryDate());
            put.setInstrumentType("PE");
            put.setUnderlying(underlying);
            put.setSegment("PUT_OPTIONS");
            put.setTimestamp(Instant.now());
            
            puts.add(put);
        }
        
        return puts;
    }
    
    private BigDecimal calculateOptionPrice(BigDecimal strikePrice, BigDecimal spotPrice, boolean isCall) {
        // Simple Black-Scholes approximation for mock data
        BigDecimal intrinsicValue;
        if (isCall) {
            intrinsicValue = spotPrice.subtract(strikePrice).max(BigDecimal.ZERO);
        } else {
            intrinsicValue = strikePrice.subtract(spotPrice).max(BigDecimal.ZERO);
        }
        
        // Add some time value (random component)
        BigDecimal timeValue = BigDecimal.valueOf(random.nextDouble() * 100 + 10);
        
        return intrinsicValue.add(timeValue).setScale(2, RoundingMode.HALF_UP);
    }
    
    private LocalDate getNextExpiryDate() {
        // Get next Thursday (typical F&O expiry)
        LocalDate today = LocalDate.now();
        LocalDate nextThursday = today.plusDays((4 - today.getDayOfWeek().getValue() + 7) % 7);
        if (nextThursday.isBefore(today)) {
            nextThursday = nextThursday.plusWeeks(1);
        }
        return nextThursday;
    }
}