package com.zerodha.dashboard.web;

import com.zerodha.dashboard.service.LoggingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for receiving frontend logs and writing them to files
 */
@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*") // Allow CORS for logging endpoint
public class LoggingController {
    
    private static final Logger log = LoggerFactory.getLogger(LoggingController.class);
    private final LoggingService loggingService;
    
    public LoggingController(LoggingService loggingService) {
        this.loggingService = loggingService;
    }
    
    /**
     * Receive logs from frontend and write to file
     * POST /api/logs
     */
    @PostMapping
    public ResponseEntity<?> receiveLogs(@RequestBody List<Map<String, Object>> logEntries) {
        try {
            if (logEntries == null || logEntries.isEmpty()) {
                return ResponseEntity.ok().body("No logs to process");
            }
            
            loggingService.writeLogs(logEntries);
            
            return ResponseEntity.ok().body("Logs received and written");
        } catch (Exception e) {
            log.error("Error processing logs: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Error processing logs: " + e.getMessage());
        }
    }
    
    /**
     * Health check endpoint
     * GET /api/logs/health
     */
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok().body("Logging service is running");
    }
}











