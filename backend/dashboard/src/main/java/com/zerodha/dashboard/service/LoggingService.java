package com.zerodha.dashboard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Service for handling file-based logging with rotation
 * Maintains maximum 10 log files, rotating when limit is reached
 */
@Service
public class LoggingService {
    private static final Logger log = LoggerFactory.getLogger(LoggingService.class);
    private static final int MAX_LOG_FILES = 10;
    private static final DateTimeFormatter FILE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");
    
    @Value("${app.logging.directory:logs}")
    private String logDirectory;
    
    @Value("${app.logging.enabled:true}")
    private boolean loggingEnabled;
    
    private Path logDirPath;
    private String currentLogFile;
    
    public LoggingService() {
        // Will be initialized in init() after @Value injection
    }
    
    /**
     * Initialize logging directory and current log file
     */
    private void init() {
        if (logDirPath != null) {
            return; // Already initialized
        }
        
        try {
            logDirPath = Paths.get(logDirectory);
            if (!Files.exists(logDirPath)) {
                Files.createDirectories(logDirPath);
                log.info("Created log directory: {}", logDirPath.toAbsolutePath());
            }
            
            // Create initial log file
            currentLogFile = createNewLogFile();
            log.info("Logging service initialized. Log directory: {}, Current file: {}", 
                    logDirPath.toAbsolutePath(), currentLogFile);
        } catch (IOException e) {
            log.error("Failed to initialize logging directory: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Write logs to file
     */
    public void writeLogs(List<Map<String, Object>> logEntries) {
        if (!loggingEnabled) {
            return;
        }
        
        init(); // Ensure directory is initialized
        
        if (logDirPath == null || currentLogFile == null) {
            log.warn("Logging service not properly initialized, skipping log write");
            return;
        }
        
        try {
            Path logFilePath = logDirPath.resolve(currentLogFile);
            
            // Check if current log file is getting too large (e.g., > 10MB)
            if (Files.exists(logFilePath) && Files.size(logFilePath) > 10 * 1024 * 1024) {
                rotateLogFile();
                logFilePath = logDirPath.resolve(currentLogFile);
            }
            
            try (BufferedWriter writer = Files.newBufferedWriter(logFilePath, 
                    java.nio.file.StandardOpenOption.CREATE, 
                    java.nio.file.StandardOpenOption.APPEND)) {
                
                for (Map<String, Object> entry : logEntries) {
                    String logLine = formatLogEntry(entry);
                    writer.write(logLine);
                    writer.newLine();
                }
                
                writer.flush();
            }
            
            // Clean up old log files
            cleanupOldLogs();
            
        } catch (IOException e) {
            log.error("Failed to write logs to file: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Format a log entry as a single line
     */
    private String formatLogEntry(Map<String, Object> entry) {
        StringBuilder sb = new StringBuilder();
        sb.append(entry.getOrDefault("timestamp", ""));
        sb.append(" | ");
        sb.append(entry.getOrDefault("level", "INFO").toString().toUpperCase());
        sb.append(" | ");
        sb.append(entry.getOrDefault("message", ""));
        
        if (entry.containsKey("data") && entry.get("data") != null) {
            sb.append(" | Data: ");
            sb.append(entry.get("data"));
        }
        
        if (entry.containsKey("url") && entry.get("url") != null) {
            sb.append(" | URL: ");
            sb.append(entry.get("url"));
        }
        
        return sb.toString();
    }
    
    /**
     * Create a new log file with timestamp
     */
    private String createNewLogFile() {
        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        return String.format("frontend-%s.log", timestamp);
    }
    
    /**
     * Rotate to a new log file
     */
    private void rotateLogFile() {
        currentLogFile = createNewLogFile();
        log.info("Rotated to new log file: {}", currentLogFile);
    }
    
    /**
     * Clean up old log files, keeping only the most recent MAX_LOG_FILES
     */
    private void cleanupOldLogs() {
        try {
            if (!Files.exists(logDirPath)) {
                return;
            }
            
            try (Stream<Path> paths = Files.list(logDirPath)) {
                List<Path> logFiles = paths
                    .filter(path -> path.getFileName().toString().startsWith("frontend-") 
                            && path.getFileName().toString().endsWith(".log"))
                    .sorted((a, b) -> {
                        try {
                            return Files.getLastModifiedTime(b).compareTo(Files.getLastModifiedTime(a));
                        } catch (IOException e) {
                            return 0;
                        }
                    })
                    .toList();
                
                // Delete files beyond MAX_LOG_FILES
                if (logFiles.size() > MAX_LOG_FILES) {
                    for (int i = MAX_LOG_FILES; i < logFiles.size(); i++) {
                        try {
                            Files.delete(logFiles.get(i));
                            log.debug("Deleted old log file: {}", logFiles.get(i).getFileName());
                        } catch (IOException e) {
                            log.warn("Failed to delete old log file {}: {}", 
                                    logFiles.get(i).getFileName(), e.getMessage());
                        }
                    }
                }
            }
        } catch (IOException e) {
            log.error("Failed to cleanup old log files: {}", e.getMessage(), e);
        }
    }
}















