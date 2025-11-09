package com.zerodha.dashboard.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zerodha.dashboard.service.ZerodhaSessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller for handling Zerodha Kite OAuth callbacks and authentication
 */
@RestController
@RequestMapping("/api/zerodha")
public class ZerodhaAuthController {
    
    private static final Logger log = LoggerFactory.getLogger(ZerodhaAuthController.class);
    
    @Value("${zerodha.enabled:false}")
    private boolean zerodhaEnabled;
    
    @Value("${zerodha.apikey:}")
    private String apiKey;
    
    @Value("${zerodha.apisecret:}")
    private String apiSecret;
    
    @Value("${zerodha.redirect.uri:}")
    private String redirectUri;

    @Value("${public.tunnel.url:}")
    private String publicTunnelUrl;
    
    private final ZerodhaSessionService zerodhaSessionService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ZerodhaAuthController(ZerodhaSessionService zerodhaSessionService) {
        this.zerodhaSessionService = zerodhaSessionService;
    }
    
    /**
     * OAuth callback endpoint for Zerodha Kite API
     * This endpoint receives the authorization code from Zerodha
     * 
     * IMPORTANT: The redirect URI registered with Zerodha must be publicly accessible.
     * Use a domain name (e.g., https://yourdomain.duckdns.org/api/zerodha/callback)
     * This URL cannot be changed once registered with Zerodha, so use a permanent domain.
     */
    @GetMapping("/callback")
    public ResponseEntity<Map<String, Object>> handleCallback(
            @RequestParam(value = "request_token", required = false) String requestToken,
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "error", required = false) String error) {
        
        log.info("Zerodha Kite OAuth callback received - RequestToken: {}, Action: {}, Status: {}, Error: {}", 
                requestToken != null ? "present" : "null", action, status, error);
        
        if (!zerodhaEnabled) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Zerodha API is disabled",
                            "redirect_url", "/dashboard?error=zerodha_disabled"
                    ));
        }
        
        if (error != null) {
            log.error("Zerodha Kite OAuth error: {}", error);
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "error", error,
                            "status", status != null ? status : "unknown",
                            "redirect_url", "/dashboard?error=oauth_failed"
                    ));
        }
        
        if (requestToken == null || requestToken.isEmpty()) {
            log.warn("Zerodha Kite OAuth callback received without request token");
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "No request token received",
                            "redirect_url", "/dashboard?error=no_token"
                    ));
        }
        
        try {
            log.info("Request token received successfully: {}", requestToken.substring(0, Math.min(10, requestToken.length())) + "...");
            
            // Exchange request_token for access_token using Kite API
            Map<String, Object> tokenExchangeResult = exchangeRequestTokenForAccessToken(requestToken);
            
            if (tokenExchangeResult.get("success").equals(true)) {
                String accessToken = (String) tokenExchangeResult.get("access_token");
                Map<String, String> sessionPayload = new HashMap<>();
                sessionPayload.put("access_token", accessToken);
                if (tokenExchangeResult.containsKey("public_token")) {
                    sessionPayload.put("public_token", String.valueOf(tokenExchangeResult.get("public_token")));
                }
                if (tokenExchangeResult.containsKey("user_id")) {
                    sessionPayload.put("user_id", String.valueOf(tokenExchangeResult.get("user_id")));
                }
                if (tokenExchangeResult.containsKey("user_name")) {
                    sessionPayload.put("user_name", String.valueOf(tokenExchangeResult.get("user_name")));
                }
                if (tokenExchangeResult.containsKey("login_time")) {
                    sessionPayload.put("login_time", String.valueOf(tokenExchangeResult.get("login_time")));
                } else {
                    sessionPayload.put("login_time", Instant.now().toString());
                }

                zerodhaSessionService.saveSession(sessionPayload);
                log.info("Successfully exchanged request token for access token");
                
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "OAuth authentication successful",
                        "access_token", accessToken,
                        "session_cached", true,
                        "action", action != null ? action : "none",
                        "status", status != null ? status : "success",
                        "redirect_url", "/dashboard?success=oauth_success&access_token=" + accessToken
                ));
            } else {
                String errorMsg = (String) tokenExchangeResult.getOrDefault("error", "Failed to exchange token");
                log.error("Failed to exchange request token: {}", errorMsg);
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "success", false,
                                "message", "Failed to exchange request token for access token",
                                "error", errorMsg,
                                "redirect_url", "/dashboard?error=token_exchange_failed"
                        ));
            }
            
        } catch (Exception e) {
            log.error("Error processing Zerodha Kite OAuth callback: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "message", "Error processing OAuth callback",
                            "error", e.getMessage(),
                            "redirect_url", "/dashboard?error=processing_failed"
                    ));
        }
    }
    
    /**
     * Exchange request token for access token using Zerodha Kite API
     */
    private Map<String, Object> exchangeRequestTokenForAccessToken(String requestToken) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            if (apiKey == null || apiKey.isEmpty() || apiSecret == null || apiSecret.isEmpty()) {
                log.error("API key or secret not configured");
                result.put("success", false);
                result.put("error", "API key or secret not configured");
                return result;
            }
            
            // Generate checksum: SHA256(api_key + request_token + api_secret)
            String checksumInput = apiKey + requestToken + apiSecret;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(checksumInput.getBytes(StandardCharsets.UTF_8));
            StringBuilder checksum = new StringBuilder();
            for (byte b : hash) {
                checksum.append(String.format("%02x", b));
            }
            
            log.debug("Checksum calculation - Input length: {}, API Key: {}, Request Token length: {}", 
                    checksumInput.length(), apiKey.length(), requestToken.length());
            
            // Prepare POST request
            URL url = new URL("https://api.kite.trade/session/token");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            connection.setRequestProperty("X-Kite-Version", "3"); // Required by Zerodha Kite API
            connection.setDoOutput(true);
            
            // Build request body
            String postData = "api_key=" + URLEncoder.encode(apiKey, StandardCharsets.UTF_8) +
                             "&request_token=" + URLEncoder.encode(requestToken, StandardCharsets.UTF_8) +
                             "&checksum=" + checksum.toString();
            
            log.debug("Token exchange request - API Key: {}, Request Token: {}..., Checksum: {}...", 
                    apiKey, requestToken.substring(0, Math.min(10, requestToken.length())), 
                    checksum.toString().substring(0, Math.min(10, checksum.length())));
            
            // Send request
            try (OutputStream os = connection.getOutputStream()) {
                byte[] input = postData.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }
            
            int responseCode = connection.getResponseCode();
            log.info("Token exchange response code: {}", responseCode);
            
            // Read response
            BufferedReader reader;
            if (responseCode >= 200 && responseCode < 300) {
                reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            } else {
                reader = new BufferedReader(new InputStreamReader(connection.getErrorStream()));
            }
            
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();
            
            if (responseCode == 200) {
                // Parse JSON response
                JsonNode jsonResponse = objectMapper.readTree(response.toString());
                
                if (jsonResponse.has("data") && jsonResponse.get("data").has("access_token")) {
                    String accessToken = jsonResponse.get("data").get("access_token").asText();
                    result.put("success", true);
                    result.put("access_token", accessToken);
                    if (jsonResponse.get("data").has("public_token")) {
                        result.put("public_token", jsonResponse.get("data").get("public_token").asText());
                    }
                    if (jsonResponse.get("data").has("login_time")) {
                        result.put("login_time", jsonResponse.get("data").get("login_time").asText());
                    }
                    
                    // Also store user info if available
                    if (jsonResponse.get("data").has("user_id")) {
                        result.put("user_id", jsonResponse.get("data").get("user_id").asText());
                    }
                    if (jsonResponse.get("data").has("user_name")) {
                        result.put("user_name", jsonResponse.get("data").get("user_name").asText());
                    }
                    if (jsonResponse.get("data").has("user_shortname")) {
                        result.put("user_shortname", jsonResponse.get("data").get("user_shortname").asText());
                    }
                    
                    log.info("Successfully exchanged request token for access token");
                } else {
                    log.error("Access token not found in response: {}", response.toString());
                    result.put("success", false);
                    result.put("error", "Access token not found in response");
                }
            } else {
                log.error("Token exchange failed with code {}: {}", responseCode, response.toString());
                result.put("success", false);
                
                // Try to parse error message
                try {
                    JsonNode errorResponse = objectMapper.readTree(response.toString());
                    if (errorResponse.has("message")) {
                        String errorMessage = errorResponse.get("message").asText();
                        result.put("error", errorMessage);
                        
                        // Provide more helpful error messages
                        if (errorMessage.contains("checksum")) {
                            log.error("Checksum error - verify API secret matches Zerodha app settings exactly");
                            result.put("error_type", "CHECKSUM_ERROR");
                            result.put("hint", "The API secret in application.properties may not match Zerodha app settings");
                        } else if (errorMessage.contains("invalid") || errorMessage.contains("expired")) {
                            log.error("Token error - request token may have expired or been used already");
                            result.put("error_type", "TOKEN_ERROR");
                            result.put("hint", "Request tokens expire in 30-60 seconds. Complete OAuth login immediately after getting the URL.");
                        }
                    } else {
                        result.put("error", "Token exchange failed: " + response.toString());
                    }
                } catch (Exception e) {
                    result.put("error", "Token exchange failed: " + response.toString());
                }
            }
            
        } catch (Exception e) {
            log.error("Error exchanging request token for access token: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        
        return result;
    }
    
    /**
     * Get OAuth login URL for Zerodha Kite API
     * This endpoint provides the URL to redirect users to for OAuth flow
     */
    @GetMapping("/auth-url")
    public ResponseEntity<Map<String, Object>> getAuthUrl() {
        if (!zerodhaEnabled || apiKey == null || apiKey.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Zerodha API is disabled or API key not configured"
                    ));
        }
        
        // Get redirect URI from config or use default
        String callbackUri = resolveCallbackUri();
        
        // Zerodha Kite OAuth login URL format
        String authUrl = "https://kite.zerodha.com/connect/login?" +
                "api_key=" + URLEncoder.encode(apiKey, StandardCharsets.UTF_8) +
                "&v=3";
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "auth_url", authUrl,
                "redirect_uri", callbackUri,
                "api_key", apiKey,
                "message", "Use this URL to initiate OAuth flow. After login, user will be redirected to redirect_uri"
        ));
    }
    
    /**
     * Health check for Zerodha Kite API authentication
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("zerodha_enabled", zerodhaEnabled);
        status.put("api_key_configured", apiKey != null && !apiKey.isEmpty());
        status.put("api_secret_configured", apiSecret != null && !apiSecret.isEmpty());
        status.put("callback_endpoint", resolveCallbackUri());
        status.put("auth_url_endpoint", "/api/zerodha/auth-url");
        status.put("status_endpoint", "/api/zerodha/status");
        status.put("message", zerodhaEnabled ? "Zerodha Kite API authentication endpoints are ready" : "Zerodha Kite API is disabled");
        status.put("session_active", zerodhaSessionService.hasActiveAccessToken());

        Map<String, String> snapshot = zerodhaSessionService.getSessionSnapshot();
        if (!snapshot.isEmpty()) {
            status.put("session_last_updated", snapshot.getOrDefault("updated_at", null));
            status.put("session_user_id", snapshot.getOrDefault("user_id", null));
        }
        
        return ResponseEntity.ok(status);
    }

    /**
     * Expose sanitized session information (without access token) for diagnostics.
     */
    @GetMapping("/session")
    public ResponseEntity<Map<String, Object>> getSession() {
        Map<String, Object> response = new HashMap<>();
        Map<String, String> snapshot = zerodhaSessionService.getSessionSnapshot();

        response.put("active", zerodhaSessionService.hasActiveAccessToken());
        if (!snapshot.isEmpty()) {
            response.put("user_id", snapshot.getOrDefault("user_id", null));
            response.put("user_name", snapshot.getOrDefault("user_name", null));
            response.put("public_token_present", snapshot.containsKey("public_token"));
            response.put("last_updated", snapshot.getOrDefault("updated_at", null));
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Logout endpoint to clear cached Zerodha session data.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        zerodhaSessionService.clearSession();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Zerodha session cleared"
        ));
    }

    private String resolveCallbackUri() {
        if (StringUtils.hasText(redirectUri)) {
            return redirectUri;
        }

        if (StringUtils.hasText(publicTunnelUrl)) {
            String base = publicTunnelUrl.endsWith("/") ? publicTunnelUrl.substring(0, publicTunnelUrl.length() - 1) : publicTunnelUrl;
            return base + "/api/zerodha/callback";
        }

        return "http://localhost:9000/api/zerodha/callback";
    }
}
