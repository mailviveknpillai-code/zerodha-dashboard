package com.zerodha.dashboard.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for handling Breeze API OAuth callbacks and authentication
 */
@RestController
@RequestMapping("/api/breeze")
public class BreezeAuthController {
    
    private static final Logger log = LoggerFactory.getLogger(BreezeAuthController.class);
    
    @Value("${breeze.api.enabled:true}")
    private boolean breezeApiEnabled;
    
    /**
     * OAuth callback endpoint for Breeze API
     * This endpoint receives the authorization code from ICICI Direct
     * 
     * IMPORTANT: The redirect URI registered with ICICI must be publicly accessible.
     * Use your public IP (http://122.167.184.90:8080/api/breeze/callback) or domain name.
     * Private IPs like 172.20.0.20 will NOT work from ICICI's servers.
     */
    @GetMapping("/callback")
    public ResponseEntity<Map<String, Object>> handleCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "apisession", required = false) String apiSession,
            @RequestParam(value = "error", required = false) String error,
            @RequestParam(value = "error_description", required = false) String errorDescription) {
        
        log.info("Breeze API OAuth callback received - Code: {}, ApiSession: {}, State: {}, Error: {}", 
                code != null ? "present" : "null", apiSession != null ? apiSession : "null",
                state, error);
        
        // Handle apisession parameter (Breeze API session token)
        if (apiSession != null && !apiSession.isEmpty()) {
            log.info("ApiSession token received: {}", apiSession);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Session token received successfully",
                    "apiSession", apiSession,
                    "note", "Update breeze.api.sessiontoken in application.properties with this value",
                    "redirect_url", "/dashboard?success=session_received"
            ));
        }
        
        if (!breezeApiEnabled) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Breeze API is disabled",
                            "redirect_url", "/dashboard"
                    ));
        }
        
        if (error != null) {
            log.error("Breeze API OAuth error: {} - {}", error, errorDescription);
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "error", error,
                            "error_description", errorDescription != null ? errorDescription : "Unknown error",
                            "redirect_url", "/dashboard?error=oauth_failed"
                    ));
        }
        
        if (code == null || code.isEmpty()) {
            log.warn("Breeze API OAuth callback received without authorization code");
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "No authorization code received",
                            "redirect_url", "/dashboard?error=no_code"
                    ));
        }
        
        try {
            // TODO: Exchange authorization code for access token
            // This would typically involve calling Breeze API's token endpoint
            log.info("Authorization code received successfully: {}", code.substring(0, Math.min(10, code.length())) + "...");
            
            // For now, return success - in production, you'd exchange the code for tokens
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Authorization code received successfully",
                    "code", code,
                    "state", state != null ? state : "none",
                    "redirect_url", "/dashboard?success=oauth_success",
                    "next_steps", "Exchange authorization code for access token"
            ));
            
        } catch (Exception e) {
            log.error("Error processing Breeze API OAuth callback: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "success", false,
                            "message", "Error processing OAuth callback",
                            "error", e.getMessage(),
                            "redirect_url", "/dashboard?error=processing_failed"
                    ));
        }
    }
    
    /**
     * Get OAuth authorization URL for Breeze API
     * This endpoint provides the URL to redirect users to for OAuth flow
     */
    @GetMapping("/auth-url")
    public ResponseEntity<Map<String, Object>> getAuthUrl() {
        if (!breezeApiEnabled) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", "Breeze API is disabled"
                    ));
        }
        
        // TODO: Generate proper OAuth URL with client_id, redirect_uri, state, etc.
        // This would typically be constructed using Breeze API's OAuth parameters
        String authUrl = "https://api.icicidirect.com/breezeapi/connect/authorize?" +
                "client_id=YOUR_CLIENT_ID&" +
                "redirect_uri=http://localhost:8080/api/breeze/callback&" +
                "response_type=code&" +
                "scope=read&" +
                " visibility_string";
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "auth_url", authUrl,
                "redirect_uri", "http://localhost:8080/api/breeze/callback",
                "message", "Use this URL to initiate OAuth flow"
        ));
    }
    
    /**
     * Health check for Breeze API authentication
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "breeze_api_enabled", breezeApiEnabled,
                "callback_endpoint", "http://localhost:8080/api/breeze/callback",
                "auth_url_endpoint", "http://localhost:8080/api/breeze/auth-url",
                "status_endpoint", "http://localhost:8080/api/breeze/status",
                "message", "Breeze API authentication endpoints are ready"
        ));
    }
}
