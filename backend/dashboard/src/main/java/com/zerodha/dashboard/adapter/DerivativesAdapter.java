package com.zerodha.dashboard.adapter;

import com.zerodha.dashboard.model.DerivativeContract;
import com.zerodha.dashboard.model.DerivativesChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

/**
 * Adapter for fetching and generating NIFTY derivatives data
 * Generates mock data for futures and options based on spot price
 */
@Component
public class DerivativesAdapter {
    private static final Logger log = LoggerFactory.getLogger(DerivativesAdapter.class);
    
    private static final String UNDERLYING = "NIFTY";
    private static final int LOT_SIZE = 25;
    private static final BigDecimal TICK_SIZE = new BigDecimal("0.05");
    
    
    public Optional<DerivativesChain> getDerivativesChain(BigDecimal spotPrice) {
        if (spotPrice == null || spotPrice.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Invalid spot price for derivatives chain: {}", spotPrice);
            return Optional.empty();
        }
        
        log.info("Generating derivatives chain for {} with spot price: {}", UNDERLYING, spotPrice);
        
        DerivativesChain chain = new DerivativesChain(UNDERLYING, spotPrice);
        chain.setDataSource("MOCK_DERIVATIVES");
        
            // Set daily strike price (typically the nearest round number to spot price)
            BigDecimal dailyStrike = spotPrice.divide(new BigDecimal("50"), 0, java.math.RoundingMode.HALF_UP).multiply(new BigDecimal("50"));
        chain.setDailyStrikePrice(dailyStrike);
        log.info("Set daily strike price to: {}", dailyStrike);
        
        // Generate futures contracts
        generateFutures(chain, spotPrice);
        
        // Generate options contracts
        generateOptions(chain, spotPrice);
        
        log.info("Generated derivatives chain: {} futures, {} calls, {} puts", 
                chain.getFutures().size(), 
                chain.getCallOptions().size(), 
                chain.getPutOptions().size());
        
        return Optional.of(chain);
    }
    
    private void generateFutures(DerivativesChain chain, BigDecimal spotPrice) {
        // Generate futures for current month, next month, and month after next
        LocalDate today = LocalDate.now();
        
        // Current month (this month)
        LocalDate currentMonthExpiry = today.plusMonths(1).withDayOfMonth(25);
        generateFutureContract(chain, spotPrice, currentMonthExpiry, "CURRENT_MONTH");
        
        // Next month
        LocalDate nextMonthExpiry = today.plusMonths(2).withDayOfMonth(25);
        generateFutureContract(chain, spotPrice, nextMonthExpiry, "NEXT_MONTH");
        
        // Month after next (next+ month)
        LocalDate nextPlusMonthExpiry = today.plusMonths(3).withDayOfMonth(25);
        generateFutureContract(chain, spotPrice, nextPlusMonthExpiry, "NEXT_PLUS_MONTH");
    }
    
    private LocalDate getNextThursday(LocalDate date) {
        // Find the next Thursday from the given date
        while (date.getDayOfWeek() != java.time.DayOfWeek.THURSDAY) {
            date = date.plusDays(1);
        }
        return date;
    }
    
    private void generateFutureContract(DerivativesChain chain, BigDecimal spotPrice, LocalDate expiry, String type) {
        DerivativeContract future = new DerivativeContract();
        future.setInstrumentToken("NIFTY" + expiry.toString().replace("-", ""));
        future.setTradingsymbol("NIFTY" + expiry.toString().replace("-", "") + (type.equals("WEEKLY") ? "W" : ""));
        future.setUnderlying(UNDERLYING);
        future.setSegment("FUTURES");
        future.setInstrumentType("FUT");
        future.setExpiryDate(expiry);
        future.setStrikePrice(null); // Futures don't have strike price
        
        // Add expiry type to tradingsymbol for easy identification
        if (type.equals("WEEKLY")) {
            future.setTradingsymbol(future.getTradingsymbol() + "W");
        }
        
        future.setLastPrice(spotPrice.add(generateRandomVariation(spotPrice, 0.02)));
        future.setOpenInterest(generateRandomBigDecimal(100000, 1000000));
        future.setChange(generateRandomVariation(spotPrice, 0.01));
            future.setChangePercent(future.getChange().divide(spotPrice, 4, java.math.RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        future.setVolume(generateRandomLong(1000, 50000));
        future.setBid(future.getLastPrice().subtract(TICK_SIZE));
        future.setAsk(future.getLastPrice().add(TICK_SIZE));
        future.setHigh(future.getLastPrice().add(generateRandomVariation(spotPrice, 0.03)));
        future.setLow(future.getLastPrice().subtract(generateRandomVariation(spotPrice, 0.02)));
        future.setOpen(future.getLastPrice().subtract(generateRandomVariation(spotPrice, 0.01)));
        future.setClose(future.getLastPrice());
        future.setTotalTradedValue(future.getVolume() * future.getLastPrice().longValue());
        future.setLotSize(LOT_SIZE);
        future.setTickSize(TICK_SIZE);
        future.setBidQuantity(generateRandomLong(100, 10000));
        future.setAskQuantity(generateRandomLong(100, 10000));
        future.setTimestamp(chain.getTimestamp());
        
        chain.addFutures(future);
    }
    
    private void generateOptions(DerivativesChain chain, BigDecimal spotPrice) {
        // Generate options for current month, next month, and month after next
        LocalDate today = LocalDate.now();
        LocalDate[] expiries = {
            today.plusMonths(1).withDayOfMonth(25), // Current month
            today.plusMonths(2).withDayOfMonth(25), // Next month
            today.plusMonths(3).withDayOfMonth(25)  // Next+ month
        };
        
        for (LocalDate expiry : expiries) {
            // Generate strikes around spot price
            BigDecimal baseStrike = spotPrice.divide(new BigDecimal("50"), 0, java.math.RoundingMode.HALF_UP).multiply(new BigDecimal("50"));
            
            // Generate call options
            for (int i = -5; i <= 5; i++) {
                BigDecimal strike = baseStrike.add(new BigDecimal(i * 50));
                if (strike.compareTo(BigDecimal.ZERO) > 0) {
                    DerivativeContract call = createOption(chain, expiry, strike, "CE", spotPrice);
                    chain.addCallOption(call);
                }
            }
            
            // Generate put options
            for (int i = -5; i <= 5; i++) {
                BigDecimal strike = baseStrike.add(new BigDecimal(i * 50));
                if (strike.compareTo(BigDecimal.ZERO) > 0) {
                    DerivativeContract put = createOption(chain, expiry, strike, "PE", spotPrice);
                    chain.addPutOption(put);
                }
            }
        }
    }
    
    private DerivativeContract createOption(DerivativesChain chain, LocalDate expiry, BigDecimal strike, String type, BigDecimal spotPrice) {
        DerivativeContract option = new DerivativeContract();
        
        String expiryStr = expiry.toString().replace("-", "");
        String strikeStr = strike.toString().replace(".", "");
        option.setInstrumentToken("NIFTY" + expiryStr + strikeStr + type);
        option.setTradingsymbol("NIFTY" + expiryStr + strikeStr + type);
        option.setUnderlying(UNDERLYING);
        option.setSegment(type.equals("CE") ? "CALL_OPTIONS" : "PUT_OPTIONS");
        option.setInstrumentType(type);
        option.setExpiryDate(expiry);
        option.setStrikePrice(strike);
        
        // Calculate option price based on Black-Scholes approximation
        BigDecimal intrinsicValue = type.equals("CE") 
            ? spotPrice.subtract(strike).max(BigDecimal.ZERO)
            : strike.subtract(spotPrice).max(BigDecimal.ZERO);
        
        // Calculate time value based on distance from spot price
        BigDecimal distanceFromSpot = spotPrice.subtract(strike).abs();
        BigDecimal timeValue;
        
        if (distanceFromSpot.compareTo(new BigDecimal("50")) <= 0) {
            // ATM options - higher time value
            timeValue = generateRandomBigDecimal(100, 300);
        } else if (distanceFromSpot.compareTo(new BigDecimal("100")) <= 0) {
            // Near ATM options - medium time value
            timeValue = generateRandomBigDecimal(50, 150);
        } else {
            // OTM options - lower time value
            timeValue = generateRandomBigDecimal(10, 80);
        }
        
        option.setLastPrice(intrinsicValue.add(timeValue));
        
        option.setOpenInterest(generateRandomBigDecimal(10000, 500000));
        option.setChange(generateRandomVariation(option.getLastPrice(), 0.1));
        option.setChangePercent(option.getChange().divide(option.getLastPrice(), 4, java.math.RoundingMode.HALF_UP).multiply(new BigDecimal("100")));
        option.setVolume(generateRandomLong(100, 10000));
        option.setBid(option.getLastPrice().subtract(TICK_SIZE));
        option.setAsk(option.getLastPrice().add(TICK_SIZE));
        option.setHigh(option.getLastPrice().add(generateRandomVariation(option.getLastPrice(), 0.05)));
        option.setLow(option.getLastPrice().subtract(generateRandomVariation(option.getLastPrice(), 0.05)));
        option.setOpen(option.getLastPrice().subtract(generateRandomVariation(option.getLastPrice(), 0.02)));
        option.setClose(option.getLastPrice());
        option.setTotalTradedValue(option.getVolume() * option.getLastPrice().longValue());
        option.setLotSize(LOT_SIZE);
        option.setTickSize(TICK_SIZE);
        option.setBidQuantity(generateRandomLong(50, 5000));
        option.setAskQuantity(generateRandomLong(50, 5000));
        option.setTimestamp(chain.getTimestamp());
        
        return option;
    }
    
    private BigDecimal generateRandomVariation(BigDecimal base, double maxPercent) {
        double variation = (Math.random() - 0.5) * 2 * maxPercent;
        return base.multiply(new BigDecimal(variation));
    }
    
    private BigDecimal generateRandomBigDecimal(int min, int max) {
        int value = min + (int)(Math.random() * (max - min));
        return new BigDecimal(value);
    }
    
    private long generateRandomLong(long min, long max) {
        return min + (long)(Math.random() * (max - min));
    }
}
