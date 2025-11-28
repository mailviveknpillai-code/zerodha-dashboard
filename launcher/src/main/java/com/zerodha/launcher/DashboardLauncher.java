package com.zerodha.launcher;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * GUI Launcher for Zerodha Dashboard
 * Starts backend JAR and Cloudflare tunnel in background
 * Provides simple GUI with status and exit button
 */
public class DashboardLauncher extends JFrame {
    private JLabel statusLabel;
    private JLabel tunnelLabel;
    private JButton exitButton;
    private JButton openBrowserButton;
    
    private Process backendProcess;
    private Process tunnelProcess;
    private String tunnelUrl;
    private boolean isShuttingDown = false;
    
    private static final int BACKEND_PORT = 9000;
    private static final String BACKEND_HEALTH_URL = "http://localhost:" + BACKEND_PORT + "/api/zerodha/status";
    
    public DashboardLauncher() {
        initializeGUI();
        startServices();
    }
    
    private void initializeGUI() {
        setTitle("Zerodha Dashboard");
        setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        setSize(400, 250);
        setLocationRelativeTo(null);
        setResizable(false);
        
        // Handle window close
        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                shutdown();
            }
        });
        
        // Main panel
        JPanel mainPanel = new JPanel(new BorderLayout(10, 10));
        mainPanel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));
        
        // Status panel
        JPanel statusPanel = new JPanel(new GridLayout(3, 1, 5, 5));
        
        statusLabel = new JLabel("Starting services...");
        statusLabel.setHorizontalAlignment(SwingConstants.CENTER);
        statusPanel.add(statusLabel);
        
        tunnelLabel = new JLabel("Tunnel: Connecting...");
        tunnelLabel.setHorizontalAlignment(SwingConstants.CENTER);
        tunnelLabel.setForeground(Color.GRAY);
        statusPanel.add(tunnelLabel);
        
        mainPanel.add(statusPanel, BorderLayout.CENTER);
        
        // Button panel
        JPanel buttonPanel = new JPanel(new FlowLayout());
        
        openBrowserButton = new JButton("Open Dashboard");
        openBrowserButton.setEnabled(false);
        openBrowserButton.addActionListener(e -> openBrowser());
        buttonPanel.add(openBrowserButton);
        
        exitButton = new JButton("Exit");
        exitButton.addActionListener(e -> shutdown());
        buttonPanel.add(exitButton);
        
        mainPanel.add(buttonPanel, BorderLayout.SOUTH);
        
        add(mainPanel);
    }
    
    private void startServices() {
        CompletableFuture.runAsync(() -> {
            try {
                // Start backend
                SwingUtilities.invokeLater(() -> statusLabel.setText("Starting backend..."));
                startBackend();
                
                // Wait for backend to be ready
                waitForBackend();
                
                // Start tunnel
                SwingUtilities.invokeLater(() -> {
                    statusLabel.setText("Backend ready. Starting tunnel...");
                    tunnelLabel.setText("Tunnel: Connecting...");
                });
                startTunnel();
                
                // Update UI and open browser
                SwingUtilities.invokeLater(() -> {
                    statusLabel.setText("✓ All services running");
                    statusLabel.setForeground(Color.GREEN);
                    if (tunnelUrl != null) {
                        tunnelLabel.setText("Tunnel: " + tunnelUrl);
                        tunnelLabel.setForeground(Color.BLUE);
                        openBrowserButton.setEnabled(true);
                        
                        // Automatically open browser after a short delay
                        javax.swing.Timer timer = new javax.swing.Timer(2000, e -> {
                            openBrowser();
                        });
                        timer.setRepeats(false);
                        timer.start();
                    } else {
                        tunnelLabel.setText("Tunnel: Failed to get URL");
                        tunnelLabel.setForeground(Color.RED);
                    }
                });
                
            } catch (Exception e) {
                SwingUtilities.invokeLater(() -> {
                    statusLabel.setText("Error: " + e.getMessage());
                    statusLabel.setForeground(Color.RED);
                });
                e.printStackTrace();
            }
        });
    }
    
    private void startBackend() throws IOException {
        // Find backend JAR
        Path currentDir = Paths.get(System.getProperty("user.dir"));
        Path backendJar = findBackendJar(currentDir);
        
        if (backendJar == null) {
            throw new IOException("Backend JAR not found. Expected: dashboard-app-*.jar");
        }
        
        // Start backend process (no console window)
        ProcessBuilder pb = new ProcessBuilder(
            "java", "-jar", backendJar.toString()
        );
        pb.directory(currentDir.toFile());
        pb.redirectErrorStream(true);
        pb.redirectOutput(ProcessBuilder.Redirect.appendTo(
            new File(currentDir.toFile(), "backend.log")
        ));
        
        backendProcess = pb.start();
    }
    
    private void startTunnel() throws IOException, InterruptedException {
        // Find cloudflared
        Path cloudflared = findCloudflared();
        
        if (cloudflared == null) {
            throw new IOException("cloudflared.exe not found");
        }
        
        // Start tunnel process
        ProcessBuilder pb = new ProcessBuilder(
            cloudflared.toString(),
            "tunnel",
            "--url", "http://localhost:" + BACKEND_PORT
        );
        pb.redirectErrorStream(true);
        
        // Capture output to extract URL
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        PrintStream printStream = new PrintStream(outputStream);
        
        tunnelProcess = pb.start();
        
        // Read output in background to extract URL
        CompletableFuture.runAsync(() -> {
            try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(tunnelProcess.getInputStream()))) {
                String line;
                Pattern urlPattern = Pattern.compile("https://[a-zA-Z0-9-]+\\.(trycloudflare\\.com|cfargotunnel\\.com)");
                
                while ((line = reader.readLine()) != null) {
                    printStream.println(line);
                    Matcher matcher = urlPattern.matcher(line);
                    if (matcher.find()) {
                        tunnelUrl = matcher.group();
                        SwingUtilities.invokeLater(() -> {
                            tunnelLabel.setText("Tunnel: " + tunnelUrl);
                            tunnelLabel.setForeground(Color.BLUE);
                            openBrowserButton.setEnabled(true);
                        });
                        break;
                    }
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        });
        
        // Wait a bit for tunnel to establish
        Thread.sleep(3000);
    }
    
    private void waitForBackend() throws InterruptedException {
        int maxAttempts = 30;
        int attempt = 0;
        
        while (attempt < maxAttempts) {
            try {
                URL url = new URL(BACKEND_HEALTH_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(2000);
                conn.setReadTimeout(2000);
                
                int responseCode = conn.getResponseCode();
                if (responseCode == 200) {
                    return; // Backend is ready
                }
            } catch (Exception e) {
                // Backend not ready yet
            }
            
            Thread.sleep(1000);
            attempt++;
        }
        
        throw new RuntimeException("Backend failed to start within 30 seconds");
    }
    
    private Path findBackendJar(Path startDir) {
        // Look in current directory and common locations
        List<Path> searchPaths = new ArrayList<>();
        searchPaths.add(startDir);
        searchPaths.add(startDir.resolve("lib"));  // Launcher lib directory
        searchPaths.add(startDir.resolve("backend").resolve("dashboard").resolve("target"));
        searchPaths.add(startDir.resolve("target"));
        searchPaths.add(startDir.getParent());  // Parent directory
        
        for (Path base : searchPaths) {
            if (Files.exists(base)) {
                try {
                    return Files.list(base)
                        .filter(p -> p.getFileName().toString().matches("dashboard-app-.*\\.jar"))
                        .filter(p -> !p.getFileName().toString().contains("sources"))
                        .findFirst()
                        .orElse(null);
                } catch (IOException e) {
                    // Continue searching
                }
            }
        }
        return null;
    }
    
    private Path findCloudflared() {
        Path currentDir = Paths.get(System.getProperty("user.dir"));
        List<Path> searchPaths = new ArrayList<>();
        searchPaths.add(currentDir);
        searchPaths.add(currentDir.resolve("bin"));
        searchPaths.add(currentDir.resolve("tools"));
        searchPaths.add(Paths.get("C:\\vivek\\New folder")); // Custom tools location
        
        for (Path base : searchPaths) {
            Path cloudflared = base.resolve("cloudflared.exe");
            if (Files.exists(cloudflared)) {
                return cloudflared;
            }
        }
        
        // Try system PATH
        try {
            Process which = new ProcessBuilder("where", "cloudflared").start();
            try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(which.getInputStream()))) {
                String path = reader.readLine();
                if (path != null) {
                    return Paths.get(path.trim());
                }
            }
        } catch (Exception e) {
            // Not in PATH
        }
        
        return null;
    }
    
    private void openBrowser() {
        if (tunnelUrl != null) {
            try {
                // Open browser to tunnel URL (frontend is served by backend)
                Desktop.getDesktop().browse(new java.net.URI(tunnelUrl));
            } catch (Exception e) {
                JOptionPane.showMessageDialog(this,
                    "Failed to open browser: " + e.getMessage() + "\n\nPlease open manually: " + tunnelUrl,
                    "Error", JOptionPane.ERROR_MESSAGE);
            }
        } else {
            // Fallback to localhost if tunnel URL not available
            try {
                Desktop.getDesktop().browse(new java.net.URI("http://localhost:" + BACKEND_PORT));
            } catch (Exception e) {
                JOptionPane.showMessageDialog(this,
                    "Failed to open browser. Please open: http://localhost:" + BACKEND_PORT,
                    "Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }
    
    private void shutdown() {
        if (isShuttingDown) return;
        isShuttingDown = true;
        
        statusLabel.setText("Shutting down...");
        statusLabel.setForeground(Color.ORANGE);
        exitButton.setEnabled(false);
        openBrowserButton.setEnabled(false);
        
        CompletableFuture.runAsync(() -> {
            try {
                // Shutdown tunnel
                if (tunnelProcess != null) {
                    try {
                        tunnelProcess.destroy();
                        Thread.sleep(2000);
                        if (tunnelProcess.isAlive()) {
                            tunnelProcess.destroyForcibly();
                        }
                    } catch (Exception e) {
                        // Ignore
                    }
                }
                
                // Shutdown backend
                if (backendProcess != null) {
                    try {
                        backendProcess.destroy();
                        Thread.sleep(5000);
                        if (backendProcess.isAlive()) {
                            backendProcess.destroyForcibly();
                        }
                    } catch (Exception e) {
                        // Ignore
                    }
                }
                
                SwingUtilities.invokeLater(() -> {
                    System.exit(0);
                });
            } catch (Exception e) {
                e.printStackTrace();
                SwingUtilities.invokeLater(() -> {
                    System.exit(1);
                });
            }
        });
    }
    
    public static void main(String[] args) {
        // Set look and feel
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception e) {
            // Use default
        }
        
        SwingUtilities.invokeLater(() -> {
            new DashboardLauncher().setVisible(true);
        });
    }
}

