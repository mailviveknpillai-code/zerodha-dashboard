package com.zerodha.dashboard.adapter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zerodha.dashboard.model.DerivativeContract;
import com.zerodha.dashboard.model.DerivativesChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

/**
 * Adapter for ICICI Direct Breeze API to fetch derivatives data
 * Documentation: https://api.icicidirect.com/breezeapi/documents/index.html
 */
@Component
public class BreezeApiAdapter {
    private static final Logger log = LoggerFactory.getLogger(BreezeApiAdapter.class);
    
    private final ObjectMapper mapper = new ObjectMapper();
    
    @Value("${breeze.api.enabled:true}")
    private boolean breezeApiEnabled;
    
    @Value("${breeze.api.appkey:}")
    private String appKey;
    
    @Value("${breeze.api.secretkey:}")
    private String secretKey;
    
    @Value("${breeze.api.sessiontoken:}")
    private String sessionToken;
    
    @Value("${breeze.api.static.ip:172.20.0.20}")
    private String staticIp;
    
    @Value("${breeze.api.network.interface:eth0}")
    private String networkInterface;
    
    // Breeze API endpoints
    private static final String BREEZE_BASE_URL = "https://api.icicidirect.com/breezeapi/api/v1";
    private static final String OPTION_CHAIN_URL = BREEZE_BASE_URL + "/optionchain";
    private static final String QUOTES_URL = BREEZE_BASE_URL + "/quotes";
    private static final String MARKET_DATA_URL = BREEZE_BASE_URL + "/marketdata";
    
    /**
     * Get spot price for underlying from Breeze API
     */
    public Optional<BigDecimal> getSpotPrice(String underlying) {
        if (!breezeApiEnabled || appKey.isEmpty() || secretKey.isEmpty()) {
            log.warn("Breeze API is disabled or credentials not provided, cannot fetch spot price");
            return Optional.empty();
        }
        
        try {
            log.info("Fetching spot price from Breeze API for underlying: {} using static IP: {}", 
                    underlying, staticIp);
            
            String url = QUOTES_URL + "?exchange_code=NSE&stock_code=" + underlying;
            String response = makeBreezeApiCall(url, "");
            if (response != null && !response.isEmpty()) {
                return parseSpotPrice(response);
            }
            
        } catch (Exception e) {
            log.error("Failed to fetch spot price from Breeze API: {}", e.getMessage(), e);
        }
        
        return Optional.empty();
    }
    
    /**
     * Get derivatives chain using Breeze API with automatic spot price fetching
     */
    public Optional<DerivativesChain> getDerivativesChain(String underlying) {
        // First get spot price from Breeze API
        Optional<BigDecimal> spotPriceOpt = getSpotPrice(underlying);
        if (!spotPriceOpt.isPresent()) {
            log.warn("Could not fetch spot price for {}, using fallback", underlying);
            return getDerivativesChain(new BigDecimal("25000")); // Fallback
        }
        
        return getDerivativesChain(spotPriceOpt.get());
    }
    
    /**
     * Get derivatives chain using Breeze API with provided spot price
     */
    public Optional<DerivativesChain> getDerivativesChain(BigDecimal spotPrice) {
        if (!breezeApiEnabled || appKey.isEmpty() || secretKey.isEmpty()) {
            log.warn("Breeze API is disabled or credentials not provided, returning empty chain");
            return Optional.empty();
        }
        
        // For now, we'll use the app key and secret key directly
        // In production, you would need to implement OAuth flow to get session token
        if (sessionToken.isEmpty()) {
            log.warn("Session token not provided, using app key for authentication");
        }
        
        try {
            log.info("Fetching derivatives data from Breeze API for spot price: {} using static IP: {} on interface: {}", 
                    spotPrice, staticIp, networkInterface);
            
            DerivativesChain chain = new DerivativesChain("NIFTY", spotPrice);
            chain.setDailyStrikePrice(spotPrice);
            chain.setTimestamp(Instant.now());
            chain.setDataSource("BREEZE_API");
            
            // Fetch option chain data
            boolean optionsSuccess = fetchOptionChainData(chain);
            if (!optionsSuccess) {
                log.warn("Failed to fetch option chain from Breeze API");
            }
            
            // Fetch futures data
            boolean futuresSuccess = fetchFuturesData(chain);
            if (!futuresSuccess) {
                log.warn("Failed to fetch futures from Breeze API");
            }
            
            // Only return chain if we have some data
            if (optionsSuccess || futuresSuccess) {
                log.info("Successfully fetched derivatives chain with {} futures, {} calls, {} puts", 
                        chain.getFutures().size(), chain.getCallOptions().size(), chain.getPutOptions().size());
                return Optional.of(chain);
            } else {
                log.warn("No data available from Breeze API, returning empty chain");
                return Optional.empty();
            }
            
        } catch (Exception e) {
            log.error("Failed to fetch Breeze derivatives data: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }
    
    private boolean fetchOptionChainData(DerivativesChain chain) {
        try {
            log.debug("Fetching option chain data from Breeze API...");
            
            String url = OPTION_CHAIN_URL + "?exchange_code=NFO&product=options&expiry_date=" + getNextExpiryDate() + "&right=&strike_price=&interval=1minute";
            String response = makeBreezeApiCall(url, "");
            if (response != null && !response.isEmpty()) {
                parseOptionChainData(response, chain);
                return chain.getCallOptions().size() > 0 || chain.getPutOptions().size() > 0;
            }
            
        } catch (Exception e) {
            log.warn("Failed to fetch option chain data from Breeze API: {}", e.getMessage());
        }
        return false;
    }
    
    private boolean fetchFuturesData(DerivativesChain chain) {
        try {
            log.debug("Fetching futures data from Breeze API...");
            
            String url = QUOTES_URL + "?exchange_code=NSE&product=futures&expiry_date=" + getNextExpiryDate() + "&right=&strike_price=&interval=1minute";
            String response = makeBreezeApiCall(url, "");
            if (response != null && !response.isEmpty()) {
                parseFuturesData(response, chain);
                return chain.getFutures().size() > 0;
            }
            
        } catch (Exception e) {
            log.warn("Failed to fetch futures data from Breeze API: {}", e.getMessage());
        }
        return false;
    }
    
    @SuppressWarnings("deprecation")
    private String makeBreezeApiCall(String urlString, String payload) throws IOException {
        try {
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            // Set headers for Breeze API
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Content-Type", "application/json");
            
            // Build authentication headers as per Breeze API requirements
            String timestamp = getCurrentTimestamp();
            String checksum = computeChecksum(payload);
            
            // Set required headers
            connection.setRequestProperty("X-AppKey", appKey);
            connection.setRequestProperty("X-Timestamp", timestamp);
            connection.setRequestProperty("X-Checksum", checksum);
            
            // Add SessionToken if available
            if (!sessionToken.isEmpty()) {
                connection.setRequestProperty("SessionToken", sessionToken);
                log.debug("Using SessionToken authentication for URL: {}", urlString);
            } else {
                log.warn("No session token provided, request may fail authentication");
            }
            
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(30000);
            
            // For GET requests, we don't send a payload
            // The parameters should be in the URL query string
            
            // Log request details for debugging
            log.info("Making Breeze API call:");
            log.info("  URL: {}", urlString);
            log.info("  Method: GET");
            log.info("  Headers: X-AppKey={}, X-Checksum={}, X-Timestamp={}, SessionToken={}", 
                appKey.substring(0, Math.min(10, appKey.length())) + "...",
                checksum.substring(0, Math.min(10, checksum.length())) + "...",
                timestamp,
                sessionToken.isEmpty() ? "N/A" : sessionToken.substring(0, Math.min(10, sessionToken.length())) + "...");
            
            int responseCode = connection.getResponseCode();
            log.info("Breeze API response code: {}", responseCode);
            
            if (responseCode == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                
                String responseBody = response.toString();
                log.info("Breeze API response length: {} characters", responseBody.length());
                log.info("Breeze API response preview: {}", 
                    responseBody.length() > 500 ? responseBody.substring(0, 500) + "..." : responseBody);
                
                // Log response headers for debugging
                log.debug("Response headers:");
                connection.getHeaderFields().forEach((key, values) -> {
                    if (key != null) {
                        log.debug("  {}: {}", key, String.join(", ", values));
                    }
                });
                
                return responseBody;
            } else {
                log.error("Breeze API returned error code: {}", responseCode);
                
                // Log error response body if available
                try {
                    BufferedReader errorReader = new BufferedReader(new InputStreamReader(connection.getErrorStream()));
                    StringBuilder errorResponse = new StringBuilder();
                    String errorLine;
                    while ((errorLine = errorReader.readLine()) != null) {
                        errorResponse.append(errorLine);
                    }
                    errorReader.close();
                    
                    if (errorResponse.length() > 0) {
                        log.error("Breeze API error response body: {}", errorResponse.toString());
                    } else {
                        log.error("Breeze API returned error code {} with no error message", responseCode);
                    }
                } catch (Exception e) {
                    log.error("Could not read error response: {}", e.getMessage());
                }
                
                return null;
            }
        } catch (Exception e) {
            log.error("Breeze API call failed: {}", e.getMessage(), e);
            return null;
        }
    }
    
    private String createOptionChainPayload() {
        return String.format("""
            {
                "exchange_code": "NFO",
                "product": "options",
                "expiry_date": "%s",
                "right": "call",
                "strike_price": "",
                "interval": "1minute"
            }
            """, getNextExpiryDate());
    }
    
    private String createFuturesQuotesPayload() {
        return String.format("""
            {
                "exchange_code": "NFO",
                "product": "futures",
                "expiry_date": "%s",
                "right": "",
                "strike_price": "",
                "interval": "1minute"
            }
            """, getNextExpiryDate());
    }
    
    private String createSpotPricePayload(String underlying) {
        return String.format("""
            {
                "exchange_code": "NSE",
                "product": "cash",
                "stock_code": "%s",
                "interval": "1minute"
            }
            """, underlying);
    }
    
    private Optional<BigDecimal> parseSpotPrice(String jsonResponse) {
        try {
            JsonNode root = mapper.readTree(jsonResponse);
            JsonNode successNode = root.path("Success");
            
            if (successNode.isArray() && successNode.size() > 0) {
                JsonNode firstItem = successNode.get(0);
                String lastPriceStr = firstItem.path("ltp").asText();
                if (!lastPriceStr.isEmpty()) {
                    BigDecimal spotPrice = new BigDecimal(lastPriceStr);
                    log.info("Successfully parsed spot price from Breeze API: {}", spotPrice);
                    return Optional.of(spotPrice);
                }
            }
            
            log.warn("No spot price data found in Breeze API response");
            return Optional.empty();
            
        } catch (Exception e) {
            log.warn("Failed to parse spot price from Breeze API: {}", e.getMessage());
            return Optional.empty();
        }
    }
    
    private void parseOptionChainData(String jsonResponse, DerivativesChain chain) {
        try {
            JsonNode root = mapper.readTree(jsonResponse);
            JsonNode successNode = root.path("Success");
            
            if (successNode.isArray()) {
                for (JsonNode optionNode : successNode) {
                    DerivativeContract contract = parseOptionContract(optionNode);
                    if (contract != null) {
                        if ("CE".equals(contract.getInstrumentType())) {
                            chain.addCallOption(contract);
                        } else if ("PE".equals(contract.getInstrumentType())) {
                            chain.addPutOption(contract);
                        }
                    }
                }
            }
            
            log.info("Parsed {} call options and {} put options from Breeze API", 
                    chain.getCallOptions().size(), chain.getPutOptions().size());
            
        } catch (Exception e) {
            log.warn("Failed to parse option chain data: {}", e.getMessage());
        }
    }
    
    private void parseFuturesData(String jsonResponse, DerivativesChain chain) {
        try {
            JsonNode root = mapper.readTree(jsonResponse);
            JsonNode successNode = root.path("Success");
            
            if (successNode.isArray()) {
                for (JsonNode futureNode : successNode) {
                    DerivativeContract contract = parseFutureContract(futureNode);
                    if (contract != null) {
                        chain.addFutures(contract);
                    }
                }
            }
            
            log.info("Parsed {} futures from Breeze API", chain.getFutures().size());
            
        } catch (Exception e) {
            log.warn("Failed to parse futures data: {}", e.getMessage());
        }
    }
    
    private DerivativeContract parseOptionContract(JsonNode node) {
        try {
            DerivativeContract contract = new DerivativeContract();
            
            contract.setInstrumentToken(node.path("instrument_token").asText());
            contract.setTradingsymbol(node.path("tradingsymbol").asText());
            contract.setUnderlying("NIFTY");
            contract.setSegment("CALL_OPTIONS".equals(node.path("segment").asText()) ? "CALL_OPTIONS" : "PUT_OPTIONS");
            contract.setInstrumentType(node.path("right").asText().equals("call") ? "CE" : "PE");
            contract.setExpiryDate(LocalDate.parse(node.path("expiry_date").asText()));
            contract.setStrikePrice(new BigDecimal(node.path("strike_price").asText()));
            
            // Market data
            contract.setLastPrice(new BigDecimal(node.path("ltp").asText()));
            contract.setOpenInterest(new BigDecimal(node.path("oi").asText()));
            contract.setChange(new BigDecimal(node.path("change").asText()));
            contract.setChangePercent(new BigDecimal(node.path("change_percent").asText()));
            contract.setVolume(node.path("volume").asLong());
            contract.setBid(new BigDecimal(node.path("bid").asText()));
            contract.setAsk(new BigDecimal(node.path("ask").asText()));
            contract.setHigh(new BigDecimal(node.path("high").asText()));
            contract.setLow(new BigDecimal(node.path("low").asText()));
            contract.setOpen(new BigDecimal(node.path("open").asText()));
            contract.setClose(new BigDecimal(node.path("close").asText()));
            contract.setTotalTradedValue(node.path("total_traded_value").asLong());
            contract.setLotSize(node.path("lot_size").asInt());
            contract.setTickSize(new BigDecimal(node.path("tick_size").asText()));
            contract.setBidQuantity(node.path("bid_qty").asLong());
            contract.setAskQuantity(node.path("ask_qty").asLong());
            contract.setTimestamp(Instant.now());
            
            return contract;
            
        } catch (Exception e) {
            log.warn("Failed to parse option contract: {}", e.getMessage());
            return null;
        }
    }
    
    private DerivativeContract parseFutureContract(JsonNode node) {
        try {
            DerivativeContract contract = new DerivativeContract();
            
            contract.setInstrumentToken(node.path("instrument_token").asText());
            contract.setTradingsymbol(node.path("tradingsymbol").asText());
            contract.setUnderlying("NIFTY");
            contract.setSegment("FUTURES");
            contract.setInstrumentType("FUT");
            contract.setExpiryDate(LocalDate.parse(node.path("expiry_date").asText()));
            contract.setStrikePrice(null); // Futures don't have strike price
            
            // Market data
            contract.setLastPrice(new BigDecimal(node.path("ltp").asText()));
            contract.setOpenInterest(new BigDecimal(node.path("oi").asText()));
            contract.setChange(new BigDecimal(node.path("change").asText()));
            contract.setChangePercent(new BigDecimal(node.path("change_percent").asText()));
            contract.setVolume(node.path("volume").asLong());
            contract.setBid(new BigDecimal(node.path("bid").asText()));
            contract.setAsk(new BigDecimal(node.path("ask").asText()));
            contract.setHigh(new BigDecimal(node.path("high").asText()));
            contract.setLow(new BigDecimal(node.path("low").asText()));
            contract.setOpen(new BigDecimal(node.path("open").asText()));
            contract.setClose(new BigDecimal(node.path("close").asText()));
            contract.setTotalTradedValue(node.path("total_traded_value").asLong());
            contract.setLotSize(node.path("lot_size").asInt());
            contract.setTickSize(new BigDecimal(node.path("tick_size").asText()));
            contract.setBidQuantity(node.path("bid_qty").asLong());
            contract.setAskQuantity(node.path("ask_qty").asLong());
            contract.setTimestamp(Instant.now());
            
            return contract;
            
        } catch (Exception e) {
            log.warn("Failed to parse future contract: {}", e.getMessage());
            return null;
        }
    }
    
    private String getCurrentTimestamp() {
        return java.time.Instant.now().toString().substring(0, 19) + ".000Z";
    }
    
    private String computeChecksum(String payload) {
        try {
            String timestamp = getCurrentTimestamp();
            String data = timestamp + payload + secretKey;
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes("UTF-8"));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            log.error("Failed to compute checksum: {}", e.getMessage());
            return "";
        }
    }
    
    private String getNextExpiryDate() {
        LocalDate today = LocalDate.now();
        LocalDate nextMonth = today.plusMonths(1);
        return getLastThursdayOfMonth(nextMonth).format(DateTimeFormatter.ISO_LOCAL_DATE);
    }
    
    private LocalDate getLastThursdayOfMonth(LocalDate month) {
        LocalDate lastDayOfMonth = month.withDayOfMonth(month.lengthOfMonth());
        int dayOfWeek = lastDayOfMonth.getDayOfWeek().getValue();
        int daysToSubtract = (dayOfWeek + 3) % 7; // Thursday is 4, so (4 + 3) % 7 = 0
        return lastDayOfMonth.minusDays(daysToSubtract);
    }
    
}
