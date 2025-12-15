package com.zerodha.dashboard.adapter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zerodha.dashboard.model.DerivativeContract;
import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.model.TickSnapshot;
import com.zerodha.dashboard.service.ZerodhaSessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Adapter for Zerodha Kite API to fetch derivatives data
 * This is the production-ready implementation for Zerodha integration
 */
@Component
public class ZerodhaApiAdapter {
    private static final Logger log = LoggerFactory.getLogger(ZerodhaApiAdapter.class);
    
    private final ObjectMapper mapper = new ObjectMapper();
    
    @Value("${zerodha.enabled:false}")
    private boolean zerodhaEnabled;
    
    @Value("${zerodha.apikey:}")
    private String apiKey;

    private final ZerodhaSessionService zerodhaSessionService;

    public ZerodhaApiAdapter(ZerodhaSessionService zerodhaSessionService) {
        this.zerodhaSessionService = zerodhaSessionService;
    }
    
    // Zerodha Kite API endpoints
    private static final String KITE_BASE_URL = "https://api.kite.trade";
    private static final String QUOTES_URL = KITE_BASE_URL + "/quote";
    private static final String INSTRUMENTS_URL = KITE_BASE_URL + "/instruments";
    private static final String HISTORICAL_URL = KITE_BASE_URL + "/historical";
    
    // Cache for instruments (updated daily)
    private List<ZerodhaInstrument> cachedInstruments = null;
    private LocalDate instrumentsCacheDate = null;
    
    /**
     * Get spot price for underlying from Zerodha Kite API
     */
    public Optional<BigDecimal> getSpotPrice(String underlying) {
        if (!zerodhaEnabled || apiKey.isEmpty()) {
            log.warn("Zerodha API is disabled or API key missing, cannot fetch spot price");
            return Optional.empty();
        }

        Optional<String> accessTokenOpt = zerodhaSessionService.getAccessToken();
        if (!accessTokenOpt.isPresent()) {
            log.warn("No Zerodha access token available. User login required.");
            return Optional.empty();
        }
        
        try {
            log.info("Fetching spot price from Zerodha Kite API for underlying: {}", underlying);
            
            String response = makeZerodhaApiCall(accessTokenOpt.get(), QUOTES_URL, createSpotPricePayload(underlying));
            if (response != null && !response.isEmpty()) {
                return parseSpotPrice(response, underlying);
            }
            
        } catch (Exception e) {
            log.error("Failed to fetch spot price from Zerodha Kite API: {}", e.getMessage(), e);
        }
        
        return Optional.empty();
    }
    
    /**
     * Get derivatives chain using Zerodha Kite API with automatic spot price fetching
     */
    public Optional<DerivativesChain> getDerivativesChain(String underlying) {
        // First get spot price from Zerodha Kite API
        Optional<BigDecimal> spotPriceOpt = getSpotPrice(underlying);
        if (!spotPriceOpt.isPresent()) {
            log.warn("Could not fetch spot price for {}, skipping derivatives chain build", underlying);
            return Optional.empty();
        }

        return getDerivativesChain(underlying, spotPriceOpt.get());
    }
    
    /**
     * Get derivatives chain using Zerodha Kite API with provided spot price
     */
    public Optional<DerivativesChain> getDerivativesChain(String underlying, BigDecimal spotPrice) {
        if (!zerodhaEnabled || apiKey.isEmpty()) {
            log.warn("Zerodha API is disabled or API key missing, returning empty chain");
            return Optional.empty();
        }

        Optional<String> accessTokenOpt = zerodhaSessionService.getAccessToken();
        if (!accessTokenOpt.isPresent()) {
            log.warn("No Zerodha access token available while fetching derivatives chain");
            return Optional.empty();
        }

        String accessToken = accessTokenOpt.get();
        
        try {
            log.info("Fetching derivatives data from Zerodha Kite API for underlying: {} with spot price: {}", 
                    underlying, spotPrice);
            
            DerivativesChain chain = new DerivativesChain(underlying, spotPrice);
            chain.setDailyStrikePrice(spotPrice);
            chain.setTimestamp(Instant.now());
            chain.setDataSource("ZERODHA_KITE");
            
            // Fetch futures data first to establish a reference price
            boolean futuresSuccess = fetchFuturesData(chain, underlying, accessToken);
            if (!futuresSuccess) {
                log.warn("Failed to fetch futures from Zerodha Kite API");
            }
            
            BigDecimal referencePrice = chain.getFutures().stream()
                    .map(DerivativeContract::getLastPrice)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(chain.getSpotPrice());

            if (referencePrice != null) {
                log.info("Using reference price {} for option selection", referencePrice);
            } else {
                log.warn("Reference price unavailable, falling back to default option selection");
            }

            // Fetch option chain data using the reference price to focus on relevant strikes
            boolean optionsSuccess = fetchOptionChainData(chain, underlying, referencePrice, accessToken);
            if (!optionsSuccess) {
                log.warn("Failed to fetch option chain from Zerodha Kite API");
            }
            
            // Only return chain if we have some data
            if (optionsSuccess || futuresSuccess) {
                log.info("Successfully fetched derivatives chain with {} futures, {} calls, {} puts", 
                        chain.getFutures().size(), chain.getCallOptions().size(), chain.getPutOptions().size());
                return Optional.of(chain);
            } else {
                log.warn("No data available from Zerodha Kite API, returning empty chain");
                return Optional.empty();
            }
            
        } catch (Exception e) {
            log.error("Failed to fetch Zerodha derivatives data: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    
    /**
     * Get market quote from Zerodha Kite API
     */
    public Optional<TickSnapshot> getQuote(String symbol) {
        if (!zerodhaEnabled || apiKey.isEmpty()) {
            log.warn("Zerodha API is disabled or API key missing, cannot fetch quote");
            return Optional.empty();
        }

        Optional<String> accessTokenOpt = zerodhaSessionService.getAccessToken();
        if (!accessTokenOpt.isPresent()) {
            log.warn("No Zerodha access token available while fetching quote");
            return Optional.empty();
        }
        
        try {
            log.info("Fetching quote from Zerodha Kite API for symbol: {}", symbol);
            
            String response = makeZerodhaApiCall(accessTokenOpt.get(), QUOTES_URL, createQuotePayload(symbol));
            if (response != null && !response.isEmpty()) {
                return parseQuote(response, symbol);
            }
            
        } catch (Exception e) {
            log.error("Failed to fetch quote from Zerodha Kite API: {}", e.getMessage(), e);
        }
        
        return Optional.empty();
    }
    
    private boolean fetchOptionChainData(DerivativesChain chain, String underlying, BigDecimal referencePrice, String accessToken) {
        try {
            log.info("Fetching option chain data from Zerodha Kite API for {}", underlying);
            
            // Get NIFTY option instruments
            List<ZerodhaInstrument> optionInstruments = getNiftyOptionInstruments(underlying, referencePrice, accessToken);
            if (optionInstruments.isEmpty()) {
                log.warn("No option instruments found for {}", underlying);
                return false;
            }
            
            log.info("Found {} option instruments for {}", optionInstruments.size(), underlying);
            
            // Get quotes for option instruments (limit to 200 tokens per request)
            // CRITICAL FIX: Zerodha quote API requires tradingsymbol, not instrument token
            List<String> tokens = optionInstruments.stream()
                .map(i -> "NFO:" + i.getTradingsymbol())
                .collect(Collectors.toList());
            
            // Split into batches of 200 (Zerodha API limit)
            int batchSize = 200;
            boolean hasData = false;
            
            for (int i = 0; i < tokens.size(); i += batchSize) {
                List<String> batch = tokens.subList(i, Math.min(i + batchSize, tokens.size()));
                String quoteResponse = fetchQuotes(batch, accessToken);
                
                if (quoteResponse != null && !quoteResponse.isEmpty()) {
                    parseOptionChainQuotes(quoteResponse, optionInstruments, chain);
                    hasData = true;
                }
            }
            
            return hasData && (chain.getCallOptions().size() > 0 || chain.getPutOptions().size() > 0);
            
        } catch (Exception e) {
            log.error("Failed to fetch option chain data from Zerodha Kite API: {}", e.getMessage(), e);
        }
        return false;
    }
    
    private boolean fetchFuturesData(DerivativesChain chain, String underlying, String accessToken) {
        try {
            log.info("Fetching futures data from Zerodha Kite API for {}", underlying);
            
            // Get NIFTY futures instruments
            List<ZerodhaInstrument> futuresInstruments = getNiftyFuturesInstruments(underlying, accessToken);
            if (futuresInstruments.isEmpty()) {
                log.warn("No futures instruments found for {}", underlying);
                return false;
            }
            
            log.info("Found {} futures instruments for {}", futuresInstruments.size(), underlying);
            
            // Get quotes for futures instruments
            // CRITICAL FIX: Zerodha quote API requires tradingsymbol, not instrument token
            List<String> tokens = futuresInstruments.stream()
                .map(i -> "NFO:" + i.getTradingsymbol())
                .collect(Collectors.toList());
            
            String quoteResponse = fetchQuotes(tokens, accessToken);
            
            if (quoteResponse != null && !quoteResponse.isEmpty()) {
                parseFuturesQuotes(quoteResponse, futuresInstruments, chain);
                return chain.getFutures().size() > 0;
            }
            
        } catch (Exception e) {
            log.error("Failed to fetch futures data from Zerodha Kite API: {}", e.getMessage(), e);
        }
        return false;
    }
    
    private String makeZerodhaApiCall(String accessToken, String urlString, String queryParams) throws IOException {
        if (!StringUtils.hasText(accessToken)) {
            log.warn("Missing Zerodha access token for API call to {}", urlString);
            return null;
        }

        try {
            String fullUrl = urlString;
            if (queryParams != null && !queryParams.isEmpty()) {
                fullUrl += "?" + queryParams;
            }
            
            URL url = URI.create(fullUrl).toURL();
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            // Set headers for Zerodha Kite API
            connection.setRequestMethod("GET");
            connection.setRequestProperty("X-Kite-Version", "3");
            connection.setRequestProperty("Authorization", "token " + apiKey + ":" + accessToken);
            
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(30000);
            
            int responseCode = connection.getResponseCode();
            log.debug("Zerodha Kite API response code: {} for URL: {}", responseCode, fullUrl);
            
            if (responseCode == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                
                while ((line = reader.readLine()) != null) {
                    response.append(line).append("\n");
                }
                reader.close();
                
                String responseStr = response.toString().trim();
                log.debug("Zerodha Kite API response length: {}", responseStr.length());
                log.debug("Zerodha Kite API response (first 500 chars): {}", responseStr.length() > 500 ? responseStr.substring(0, 500) : responseStr);
                
                // Check if response is an error
                if (responseStr.startsWith("{") && (responseStr.contains("\"status\":\"error\"") || responseStr.contains("\"error_type\""))) {
                    log.warn("Zerodha Kite API returned error in response: {}", responseStr);
                    return null;
                }
                
                // Check if response has empty data (likely token expired)
                if (responseStr.contains("\"status\":\"success\"") && responseStr.contains("\"data\":{}")) {
                    log.warn("Zerodha Kite API returned empty data. This usually means the access token has expired. Response: {}", responseStr);
                    // Try to parse and check for error message
                    try {
                        JsonNode root = mapper.readTree(responseStr);
                        if (root.has("data") && root.get("data").isEmpty()) {
                            log.error("Access token may be expired or invalid. Please refresh the token via OAuth.");
                        }
                    } catch (Exception e) {
                        // Ignore parsing errors
                    }
                }
                
                return responseStr;
            } else {
                // Read error response
                BufferedReader errorReader = new BufferedReader(new InputStreamReader(connection.getErrorStream()));
                StringBuilder errorResponse = new StringBuilder();
                String line;
                while ((line = errorReader.readLine()) != null) {
                    errorResponse.append(line);
                }
                errorReader.close();
                
                log.warn("Zerodha Kite API returned error code: {} with response: {}", responseCode, errorResponse.toString());
                if (responseCode == 401 || responseCode == 403) {
                    log.warn("Zerodha responded with authentication error ({}). Clearing cached session.", responseCode);
                    zerodhaSessionService.clearSession();
                }
                return null;
            }
        } catch (Exception e) {
            log.error("Zerodha Kite API call failed: {}", e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Fetch instruments list from Zerodha API
     */
    private List<ZerodhaInstrument> getInstruments(String exchange, String accessToken) throws IOException {
        // Check cache (instruments are updated daily)
        LocalDate today = LocalDate.now();
        if (cachedInstruments != null && instrumentsCacheDate != null && instrumentsCacheDate.equals(today)) {
            log.debug("Using cached instruments from {}", instrumentsCacheDate);
            return cachedInstruments.stream()
                .filter(i -> exchange == null || exchange.equals(i.getExchange()))
                .collect(Collectors.toList());
        }
        
        log.info("Fetching instruments list from Zerodha API for exchange: {}", exchange);
        String url = INSTRUMENTS_URL;
        if (exchange != null) {
            url += "/" + exchange;
        }
        
        String csvResponse = makeZerodhaApiCall(accessToken, url, null);
        if (csvResponse == null || csvResponse.isEmpty()) {
            log.error("Failed to fetch instruments list");
            return Collections.emptyList();
        }
        
        // Parse CSV response
        List<ZerodhaInstrument> instruments = parseInstrumentsCsv(csvResponse);
        log.info("Parsed {} instruments from Zerodha API", instruments.size());
        
        // Cache the instruments
        cachedInstruments = instruments;
        instrumentsCacheDate = today;
        
        return instruments.stream()
            .filter(i -> exchange == null || exchange.equals(i.getExchange()))
            .collect(Collectors.toList());
    }
    
    /**
     * Parse CSV instruments response
     * Format: instrument_token,exchange_token,tradingsymbol,name,last_price,expiry,strike,tick_size,lot_size,instrument_type,segment,exchange
     */
    private List<ZerodhaInstrument> parseInstrumentsCsv(String csv) {
        List<ZerodhaInstrument> instruments = new ArrayList<>();
        String[] lines = csv.split("\n");
        
        // Skip header line
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            
            try {
                String[] fields = line.split(",");
                if (fields.length < 12) continue;
                
                ZerodhaInstrument instrument = new ZerodhaInstrument();
                instrument.setInstrumentToken(Long.parseLong(fields[0]));
                instrument.setExchangeToken(Long.parseLong(fields[1]));
                instrument.setTradingsymbol(fields[2]);
                // Remove quotes from name field if present
                String name = fields[3];
                if (name.startsWith("\"") && name.endsWith("\"")) {
                    name = name.substring(1, name.length() - 1);
                }
                instrument.setName(name);
                
                if (!fields[4].isEmpty()) {
                    instrument.setLastPrice(Double.parseDouble(fields[4]));
                }
                
                if (!fields[5].isEmpty()) {
                    instrument.setExpiry(LocalDate.parse(fields[5], DateTimeFormatter.ofPattern("yyyy-MM-dd")));
                }
                
                if (!fields[6].isEmpty()) {
                    instrument.setStrike(Double.parseDouble(fields[6]));
                }
                
                if (!fields[7].isEmpty()) {
                    instrument.setTickSize(Double.parseDouble(fields[7]));
                }
                
                if (!fields[8].isEmpty()) {
                    instrument.setLotSize(Integer.parseInt(fields[8]));
                }
                
                instrument.setInstrumentType(fields[9]);
                instrument.setSegment(fields[10]);
                instrument.setExchange(fields[11]);
                
                instruments.add(instrument);
            } catch (Exception e) {
                log.warn("Failed to parse instrument line: {} - {}", line, e.getMessage());
            }
        }
        
        return instruments;
    }
    
    /**
     * Get NIFTY option instruments (CE and PE)
     * Dynamic filtering: Get options for current month, if empty get next month
     */
    private List<ZerodhaInstrument> getNiftyOptionInstruments(String underlying, BigDecimal referencePrice, String accessToken) throws IOException {
        List<ZerodhaInstrument> allInstruments = getInstruments("NFO", accessToken);
        LocalDate today = LocalDate.now();

        List<ZerodhaInstrument> niftyOptions = allInstruments.stream()
            .filter(i -> {
                String symbol = i.getTradingsymbol();
                if (symbol == null) return false;
                boolean isNifty = symbol.startsWith(underlying.toUpperCase());
                boolean isOption = "CE".equalsIgnoreCase(i.getInstrumentType()) || "PE".equalsIgnoreCase(i.getInstrumentType());
                return isNifty && isOption && i.getExpiry() != null && !i.getExpiry().isBefore(today);
            })
            .collect(Collectors.toList());

        if (niftyOptions.isEmpty()) {
            log.warn("No NIFTY options found for {}", underlying);
            return Collections.emptyList();
        }

        // Focus on the nearest upcoming expiry (weekly)
        Optional<LocalDate> nearestExpiryOpt = niftyOptions.stream()
            .map(ZerodhaInstrument::getExpiry)
            .filter(Objects::nonNull)
            .filter(expiry -> !expiry.isBefore(today))
            .min(LocalDate::compareTo);

        if (nearestExpiryOpt.isPresent()) {
            LocalDate nearestExpiry = nearestExpiryOpt.get();
            niftyOptions = niftyOptions.stream()
                .filter(i -> nearestExpiry.equals(i.getExpiry()))
                .collect(Collectors.toList());
            log.info("Selected {} instruments for nearest expiry {}", niftyOptions.size(), nearestExpiry);
        } else {
            log.warn("Unable to determine nearest weekly expiry, retaining full option list");
        }

        if (referencePrice != null && referencePrice.compareTo(BigDecimal.ZERO) > 0) {
            double ref = referencePrice.doubleValue();

            List<ZerodhaInstrument> sorted = niftyOptions.stream()
                .sorted(Comparator.comparingDouble(ZerodhaInstrument::getStrike))
                .collect(Collectors.toList());

            List<ZerodhaInstrument> lower = sorted.stream()
                .filter(inst -> inst.getStrike() <= ref)
                .sorted((a, b) -> Double.compare(b.getStrike(), a.getStrike()))
                .limit(100)
                .collect(Collectors.toList());
            Collections.reverse(lower);

            List<ZerodhaInstrument> higher = sorted.stream()
                .filter(inst -> inst.getStrike() >= ref)
                .limit(100)
                .collect(Collectors.toList());

            LinkedHashMap<String, ZerodhaInstrument> uniqueSelection = new LinkedHashMap<>();
            lower.forEach(inst -> uniqueSelection.put(inst.getTradingsymbol(), inst));
            higher.forEach(inst -> uniqueSelection.put(inst.getTradingsymbol(), inst));

            // Ensure the closest strike is included
            sorted.stream()
                .min(Comparator.comparingDouble(inst -> Math.abs(inst.getStrike() - ref)))
                .ifPresent(inst -> uniqueSelection.put(inst.getTradingsymbol(), inst));

            if (!uniqueSelection.isEmpty()) {
                List<ZerodhaInstrument> selected = new ArrayList<>(uniqueSelection.values());
                log.info("Selected {} option instruments around reference price {}", selected.size(), referencePrice);
                return selected;
            }
        }

        List<ZerodhaInstrument> fallback = niftyOptions.stream()
            .sorted(Comparator.comparingDouble(ZerodhaInstrument::getStrike))
            .limit(400)
            .collect(Collectors.toList());
        log.info("Selected fallback option instrument set of size {}", fallback.size());
        return fallback;
    }
    
    /**
     * Get NIFTY futures instruments
     */
    private List<ZerodhaInstrument> getNiftyFuturesInstruments(String underlying, String accessToken) throws IOException {
        List<ZerodhaInstrument> allInstruments = getInstruments("NFO", accessToken);
        LocalDate today = LocalDate.now();
        
        // Filter for NIFTY futures
        LocalDate currentMonthExpiry = getCurrentMonthExpiry(today);
        
        return allInstruments.stream()
            .filter(i -> {
                String symbol = i.getTradingsymbol();
                if (symbol == null) return false;
                
                boolean isNifty = symbol.startsWith(underlying.toUpperCase());
                boolean isFutures = "FUT".equals(i.getInstrumentType());
                boolean isCurrentExpiry = i.getExpiry() != null && 
                    (i.getExpiry().equals(currentMonthExpiry) || 
                     i.getExpiry().isAfter(today) && i.getExpiry().isBefore(currentMonthExpiry.plusMonths(2)));
                
                return isNifty && isFutures && isCurrentExpiry;
            })
            .sorted(Comparator.comparing(ZerodhaInstrument::getExpiry))
            .limit(10) // Limit to next few expiries
            .collect(Collectors.toList());
    }
    
    /**
     * Get current month expiry (typically last Thursday)
     * NOTE: This is used for futures, not options (options are weekly)
     */
    private LocalDate getCurrentMonthExpiry(LocalDate date) {
        // NIFTY futures expire on last Thursday of the month
        LocalDate lastDayOfMonth = date.withDayOfMonth(date.lengthOfMonth());
        
        // Find last Thursday
        LocalDate lastThursday = lastDayOfMonth;
        while (lastThursday.getDayOfWeek().getValue() != 4) { // 4 = Thursday
            lastThursday = lastThursday.minusDays(1);
        }
        
        // If today is after last Thursday, get next month's expiry
        if (date.isAfter(lastThursday)) {
            LocalDate nextMonth = date.plusMonths(1);
            lastDayOfMonth = nextMonth.withDayOfMonth(nextMonth.lengthOfMonth());
            lastThursday = lastDayOfMonth;
            while (lastThursday.getDayOfWeek().getValue() != 4) {
                lastThursday = lastThursday.minusDays(1);
            }
        }
        
        return lastThursday;
    }
    
    /**
     * Fetch quotes for multiple instrument tokens
     */
    private String fetchQuotes(List<String> tokens, String accessToken) throws IOException {
        if (tokens.isEmpty()) {
            return null;
        }
        
        // Build query string: depth=true&oi=true&i=TOKEN1&i=TOKEN2...
        StringBuilder queryBuilder = new StringBuilder("depth=true&oi=true");
        for (String token : tokens) {
            queryBuilder.append("&i=").append(URLEncoder.encode(token, StandardCharsets.UTF_8));
        }
        
        return makeZerodhaApiCall(accessToken, QUOTES_URL, queryBuilder.toString());
    }
    
    private String createSpotPricePayload(String underlying) {
        // CRITICAL FIX: Zerodha quote API works with tradingsymbol, not just token
        // For NIFTY index, use tradingsymbol "NIFTY 50" instead of token
        if ("NIFTY".equalsIgnoreCase(underlying)) {
            return "i=NSE:NIFTY%2050";  // URL encoded "NIFTY 50"
        }
        // For other underlyings, try to construct from symbol
        return "i=NSE:" + URLEncoder.encode(underlying, StandardCharsets.UTF_8);
    }
    
    private String createQuotePayload(String symbol) {
        return "i=NSE:" + symbol;
    }
    
    private Optional<BigDecimal> parseSpotPrice(String jsonResponse, String underlying) {
        try {
            JsonNode root = mapper.readTree(jsonResponse);
            JsonNode dataNode = root.path("data");
            
            // CRITICAL FIX: Response key is tradingsymbol format, not token
            // For NIFTY, the key is "NSE:NIFTY 50" not "NSE:256265"
            String symbolKey = "NSE:NIFTY 50"; // NIFTY index tradingsymbol
            if (!"NIFTY".equalsIgnoreCase(underlying)) {
                // For other underlyings, try to find by symbol
                symbolKey = "NSE:" + underlying;
            }
            
            // Try symbol key first
            if (dataNode.has(symbolKey)) {
                JsonNode underlyingData = dataNode.get(symbolKey);
                JsonNode lastPriceNode = underlyingData.path("last_price");
                if (!lastPriceNode.isMissingNode()) {
                    BigDecimal spotPrice = BigDecimal.valueOf(lastPriceNode.asDouble());
                    log.info("Successfully parsed spot price from Zerodha Kite API: {} for {}", spotPrice, symbolKey);
                    return Optional.of(spotPrice);
                }
            }
            
            // Try to find any entry in data (fallback - iterate through all keys)
            if (dataNode.isObject() && dataNode.size() > 0) {
                for (Map.Entry<String, JsonNode> entry : dataNode.properties()) {
                    JsonNode underlyingData = entry.getValue();
                    JsonNode lastPriceNode = underlyingData.path("last_price");
                    if (!lastPriceNode.isMissingNode()) {
                        BigDecimal spotPrice = BigDecimal.valueOf(lastPriceNode.asDouble());
                        log.info("Successfully parsed spot price from Zerodha Kite API (fallback): {} from key {}", spotPrice, entry.getKey());
                        return Optional.of(spotPrice);
                    }
                }
            }
            
            log.warn("No spot price data found in Zerodha Kite API response");
            return Optional.empty();
            
        } catch (Exception e) {
            log.warn("Failed to parse spot price from Zerodha Kite API: {}", e.getMessage());
            return Optional.empty();
        }
    }
    
    private Optional<TickSnapshot> parseQuote(String jsonResponse, String symbol) {
        try {
            JsonNode root = mapper.readTree(jsonResponse);
            JsonNode dataNode = root.path("data");
            
            if (dataNode.has(symbol)) {
                JsonNode symbolData = dataNode.get(symbol);
                
                TickSnapshot snapshot = new TickSnapshot();
                snapshot.setInstrumentToken(symbol);
                snapshot.setTradingsymbol(symbol);
                snapshot.setLastPrice(new BigDecimal(symbolData.path("last_price").asText()));
                snapshot.setVolume(symbolData.path("volume").asLong());
                snapshot.setSegment("ZERODHA_KITE");
                snapshot.setTimestamp(Instant.now());
                
                return Optional.of(snapshot);
            }
            
            return Optional.empty();
            
        } catch (Exception e) {
            log.warn("Failed to parse quote from Zerodha Kite API: {}", e.getMessage());
            return Optional.empty();
        }
    }
    
    /**
     * Parse option chain quotes and populate derivatives chain
     */
    private void parseOptionChainQuotes(String jsonResponse, List<ZerodhaInstrument> instruments, DerivativesChain chain) {
        try {
            JsonNode root = mapper.readTree(jsonResponse);
            JsonNode dataNode = root.path("data");
            
            // CRITICAL FIX: Response keys are tradingsymbol format, not token format
            // Create a map of tradingsymbol to instrument for quick lookup
            Map<String, ZerodhaInstrument> symbolToInstrument = new HashMap<>();
            for (ZerodhaInstrument inst : instruments) {
                symbolToInstrument.put("NFO:" + inst.getTradingsymbol(), inst);
            }
            
            // Parse each quote
            dataNode.properties().forEach(entry -> {
                String symbolKey = entry.getKey(); // e.g., "NFO:NIFTY25NOV25000CE"
                JsonNode quoteData = entry.getValue();
                
                ZerodhaInstrument instrument = symbolToInstrument.get(symbolKey);
                if (instrument == null) {
                    log.debug("Instrument not found for symbol key: {}", symbolKey);
                    return;
                }
                
                try {
                    DerivativeContract contract = new DerivativeContract();
                    contract.setInstrumentToken(String.valueOf(instrument.getInstrumentToken()));
                    contract.setTradingsymbol(instrument.getTradingsymbol());
                    contract.setUnderlying(chain.getUnderlying());
                    contract.setInstrumentType(instrument.getInstrumentType());
                    contract.setExpiryDate(instrument.getExpiry());
                    contract.setStrikePrice(BigDecimal.valueOf(instrument.getStrike()));
                    contract.setLotSize(instrument.getLotSize());
                    contract.setTickSize(BigDecimal.valueOf(instrument.getTickSize()));
                    contract.setTimestamp(Instant.now());
                    
                    // Parse quote data
                    JsonNode depth = quoteData.path("depth");
                    JsonNode ohlc = quoteData.path("ohlc");
                    JsonNode lastPriceNode = quoteData.path("last_price");
                    
                    if (!lastPriceNode.isMissingNode()) {
                        contract.setLastPrice(BigDecimal.valueOf(lastPriceNode.asDouble()));
                    }
                    
                    if (!ohlc.isMissingNode()) {
                        if (!ohlc.path("open").isMissingNode()) {
                            contract.setOpen(BigDecimal.valueOf(ohlc.path("open").asDouble()));
                        }
                        if (!ohlc.path("high").isMissingNode()) {
                            contract.setHigh(BigDecimal.valueOf(ohlc.path("high").asDouble()));
                        }
                        if (!ohlc.path("low").isMissingNode()) {
                            contract.setLow(BigDecimal.valueOf(ohlc.path("low").asDouble()));
                        }
                        if (!ohlc.path("close").isMissingNode()) {
                            contract.setClose(BigDecimal.valueOf(ohlc.path("close").asDouble()));
                        }
                    }
                    
                    // Parse depth (bid/ask)
                    // CRITICAL FIX: Depth structure is {"buy": [{price, quantity, orders}], "sell": [{price, quantity, orders}]}
                    // Not an array, but an object with "buy" and "sell" keys
                    if (!depth.isMissingNode() && depth.isObject()) {
                        JsonNode buyDepth = depth.path("buy");
                        JsonNode sellDepth = depth.path("sell");
                        
                        // Get best bid (first item in buy array)
                        if (!buyDepth.isMissingNode() && buyDepth.isArray() && buyDepth.size() > 0) {
                            JsonNode bestBid = buyDepth.get(0);
                            if (bestBid.isObject()) {
                                JsonNode bidPrice = bestBid.path("price");
                                JsonNode bidQty = bestBid.path("quantity");
                                if (!bidPrice.isMissingNode()) {
                                    contract.setBid(BigDecimal.valueOf(bidPrice.asDouble()));
                                }
                                if (!bidQty.isMissingNode()) {
                                    contract.setBidQuantity(bidQty.asLong());
                                }
                            }
                        }
                        
                        // Get best ask (first item in sell array)
                        if (!sellDepth.isMissingNode() && sellDepth.isArray() && sellDepth.size() > 0) {
                            JsonNode bestAsk = sellDepth.get(0);
                            if (bestAsk.isObject()) {
                                JsonNode askPrice = bestAsk.path("price");
                                JsonNode askQty = bestAsk.path("quantity");
                                if (!askPrice.isMissingNode()) {
                                    contract.setAsk(BigDecimal.valueOf(askPrice.asDouble()));
                                }
                                if (!askQty.isMissingNode()) {
                                    contract.setAskQuantity(askQty.asLong());
                                }
                            }
                        }
                    }
                    
                    // Parse volume and OI
                    if (!quoteData.path("volume").isMissingNode()) {
                        contract.setVolume(quoteData.path("volume").asLong());
                    }
                    if (!quoteData.path("oi").isMissingNode()) {
                        contract.setOpenInterest(BigDecimal.valueOf(quoteData.path("oi").asDouble()));
                    }
                    
                    // Calculate change if we have last price and close
                    if (contract.getLastPrice() != null && contract.getClose() != null) {
                        BigDecimal change = contract.getLastPrice().subtract(contract.getClose());
                        contract.setChange(change);
                        if (contract.getClose().compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal changePercent = change.divide(contract.getClose(), 4, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100));
                            contract.setChangePercent(changePercent);
                        } else {
                            // If close is zero, set changePercent to zero instead of leaving it null
                            contract.setChangePercent(BigDecimal.ZERO);
                        }
                    }
                    
                    // Add to appropriate list
                    if ("CE".equals(instrument.getInstrumentType())) {
                        contract.setSegment("CALL_OPTIONS");
                        chain.addCallOption(contract);
                    } else if ("PE".equals(instrument.getInstrumentType())) {
                        contract.setSegment("PUT_OPTIONS");
                        chain.addPutOption(contract);
                    }
                    
                } catch (Exception e) {
                    log.warn("Failed to parse quote for symbol {}: {}", symbolKey, e.getMessage());
                }
            });
            
            log.info("Parsed {} call options and {} put options", 
                chain.getCallOptions().size(), chain.getPutOptions().size());
            
        } catch (Exception e) {
            log.error("Failed to parse option chain quotes: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Parse futures quotes and populate derivatives chain
     */
    private void parseFuturesQuotes(String jsonResponse, List<ZerodhaInstrument> instruments, DerivativesChain chain) {
        try {
            JsonNode root = mapper.readTree(jsonResponse);
            JsonNode dataNode = root.path("data");
            
            // CRITICAL FIX: Response keys are tradingsymbol format, not token format
            // Create a map of tradingsymbol to instrument for quick lookup
            Map<String, ZerodhaInstrument> symbolToInstrument = new HashMap<>();
            for (ZerodhaInstrument inst : instruments) {
                symbolToInstrument.put("NFO:" + inst.getTradingsymbol(), inst);
            }
            
            // Parse each quote
            dataNode.properties().forEach(entry -> {
                String symbolKey = entry.getKey(); // e.g., "NFO:NIFTY25NOVFUT"
                JsonNode quoteData = entry.getValue();
                
                ZerodhaInstrument instrument = symbolToInstrument.get(symbolKey);
                if (instrument == null) {
                    log.debug("Instrument not found for symbol key: {}", symbolKey);
                    return;
                }
                
                try {
                    DerivativeContract contract = new DerivativeContract();
                    contract.setInstrumentToken(String.valueOf(instrument.getInstrumentToken()));
                    contract.setTradingsymbol(instrument.getTradingsymbol());
                    contract.setUnderlying(chain.getUnderlying());
                    contract.setInstrumentType("FUT");
                    contract.setSegment("FUTURES");
                    contract.setExpiryDate(instrument.getExpiry());
                    contract.setLotSize(instrument.getLotSize());
                    contract.setTickSize(BigDecimal.valueOf(instrument.getTickSize()));
                    contract.setTimestamp(Instant.now());
                    
                    // Parse quote data
                    JsonNode depth = quoteData.path("depth");
                    JsonNode ohlc = quoteData.path("ohlc");
                    JsonNode lastPriceNode = quoteData.path("last_price");
                    
                    if (!lastPriceNode.isMissingNode()) {
                        contract.setLastPrice(BigDecimal.valueOf(lastPriceNode.asDouble()));
                    }
                    
                    if (!ohlc.isMissingNode()) {
                        if (!ohlc.path("open").isMissingNode()) {
                            contract.setOpen(BigDecimal.valueOf(ohlc.path("open").asDouble()));
                        }
                        if (!ohlc.path("high").isMissingNode()) {
                            contract.setHigh(BigDecimal.valueOf(ohlc.path("high").asDouble()));
                        }
                        if (!ohlc.path("low").isMissingNode()) {
                            contract.setLow(BigDecimal.valueOf(ohlc.path("low").asDouble()));
                        }
                        if (!ohlc.path("close").isMissingNode()) {
                            contract.setClose(BigDecimal.valueOf(ohlc.path("close").asDouble()));
                        }
                    }
                    
                    // Parse depth (bid/ask)
                    // CRITICAL FIX: Depth structure is {"buy": [{price, quantity, orders}], "sell": [{price, quantity, orders}]}
                    // Not an array, but an object with "buy" and "sell" keys
                    if (!depth.isMissingNode() && depth.isObject()) {
                        JsonNode buyDepth = depth.path("buy");
                        JsonNode sellDepth = depth.path("sell");
                        
                        // Get best bid (first item in buy array)
                        if (!buyDepth.isMissingNode() && buyDepth.isArray() && buyDepth.size() > 0) {
                            JsonNode bestBid = buyDepth.get(0);
                            if (bestBid.isObject()) {
                                JsonNode bidPrice = bestBid.path("price");
                                JsonNode bidQty = bestBid.path("quantity");
                                if (!bidPrice.isMissingNode()) {
                                    contract.setBid(BigDecimal.valueOf(bidPrice.asDouble()));
                                }
                                if (!bidQty.isMissingNode()) {
                                    contract.setBidQuantity(bidQty.asLong());
                                }
                            }
                        }
                        
                        // Get best ask (first item in sell array)
                        if (!sellDepth.isMissingNode() && sellDepth.isArray() && sellDepth.size() > 0) {
                            JsonNode bestAsk = sellDepth.get(0);
                            if (bestAsk.isObject()) {
                                JsonNode askPrice = bestAsk.path("price");
                                JsonNode askQty = bestAsk.path("quantity");
                                if (!askPrice.isMissingNode()) {
                                    contract.setAsk(BigDecimal.valueOf(askPrice.asDouble()));
                                }
                                if (!askQty.isMissingNode()) {
                                    contract.setAskQuantity(askQty.asLong());
                                }
                            }
                        }
                    }
                    
                    // Parse volume and OI
                    if (!quoteData.path("volume").isMissingNode()) {
                        contract.setVolume(quoteData.path("volume").asLong());
                    }
                    if (!quoteData.path("oi").isMissingNode()) {
                        contract.setOpenInterest(BigDecimal.valueOf(quoteData.path("oi").asDouble()));
                    }
                    
                    // Calculate change if we have last price and close
                    if (contract.getLastPrice() != null && contract.getClose() != null) {
                        BigDecimal change = contract.getLastPrice().subtract(contract.getClose());
                        contract.setChange(change);
                        if (contract.getClose().compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal changePercent = change.divide(contract.getClose(), 4, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100));
                            contract.setChangePercent(changePercent);
                        } else {
                            // If close is zero, set changePercent to zero instead of leaving it null
                            contract.setChangePercent(BigDecimal.ZERO);
                        }
                    }
                    
                    chain.addFutures(contract);
                    
                } catch (Exception e) {
                    log.warn("Failed to parse futures quote for symbol {}: {}", symbolKey, e.getMessage());
                }
            });
            
            log.info("Parsed {} futures contracts", chain.getFutures().size());
            
        } catch (Exception e) {
            log.error("Failed to parse futures quotes: {}", e.getMessage(), e);
        }
    }
}
