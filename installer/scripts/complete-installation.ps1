# Zerodha Dashboard - Complete Installation
# This script completes the installation after tunnel provisioning

param(
    [Parameter(Mandatory=$true)]
    [string]$ZerodhaApiKey,
    
    [Parameter(Mandatory=$true)]
    [string]$ZerodhaApiSecret,
    
    [Parameter(Mandatory=$false)]
    [string]$StaticIp = "",
    
    [Parameter(Mandatory=$false)]
    [string]$NetworkInterface = "eth0",
    
    [Parameter(Mandatory=$true)]
    [string]$TunnelUrl
)

# Installation directories
$INSTALL_DIR = "${env:ProgramFiles}\ZerodhaDashboard"
$BACKEND_DIR = Join-Path $INSTALL_DIR "backend"
$CLOUDFLARED_DIR = Join-Path $INSTALL_DIR "cloudflared"
$LOGS_DIR = Join-Path $INSTALL_DIR "logs"
$BIN_DIR = Join-Path $INSTALL_DIR "installer\bin"

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logFile = Join-Path $LOGS_DIR "install.log"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    if (-not (Test-Path $LOGS_DIR)) {
        New-Item -ItemType Directory -Path $LOGS_DIR -Force | Out-Null
    }
    
    Add-Content -Path $logFile -Value $logMessage -ErrorAction SilentlyContinue
    
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN" { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage -ForegroundColor White }
    }
}

try {
    Write-Log "========================================" "INFO"
    Write-Log "Completing Installation" "INFO"
    Write-Log "========================================" "INFO"
    
    # Use tunnel URL from parameter (user entered it manually)
    $publicHostname = $TunnelUrl.Trim()
    
    # Remove https:// if present
    if ($publicHostname -match "^https?://") {
        $publicHostname = $publicHostname -replace "^https?://", ""
    }
    
    Write-Log "Using tunnel URL: $publicHostname" "INFO"
    
    # Update application.properties
    try {
        Write-Log "Updating application.properties..." "INFO"
        $propertiesPath = Join-Path $BACKEND_DIR "application.properties"
        $configDir = Join-Path $BACKEND_DIR "config"
        $configPropertiesPath = Join-Path $configDir "application.properties"
        
        if (-not (Test-Path $configDir)) {
            New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        }
        
        $propertiesContent = @"
# === Zerodha Kite API Configuration ===
zerodha.enabled=true
zerodha.apikey=$ZerodhaApiKey
zerodha.apisecret=$ZerodhaApiSecret
zerodha.access.token=

# === Public Tunnel / Callback Configuration ===
public.tunnel.url=https://$publicHostname
zerodha.redirect.uri=https://$publicHostname/api/zerodha/callback

# === Web / CORS Configuration ===
app.cors.allowed-origins=http://localhost:5173,https://$publicHostname

# === ICICI Direct Breeze API Configuration (Optional) ===
breeze.api.enabled=false
breeze.api.static.ip=$StaticIp
breeze.api.network.interface=$NetworkInterface

# === Server Configuration ===
server.port=9000

# === Redis Configuration ===
spring.data.redis.host=localhost
spring.data.redis.port=6379

# === Logging Configuration ===
logging.level.root=INFO
logging.level.com.zerodha=DEBUG
logging.file.name=logs/zerodha-dashboard.log
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level %logger{36} - %msg%n
spring.lifecycle.timeout-per-shutdown-phase=30s

# === Redis Cache Configuration ===
redis.snapshot.ttl=PT5M
redis.namespace=zerodha:snapshot:
redis.latest.cache.ttl=PT10M
redis.latest.cache.key=zerodha:latest:NIFTY
cache.update.enabled=true
cache.update.interval.ms=750

# === Mock Data Configuration ===
mock.data.enabled=false
"@
        
        [System.IO.File]::WriteAllText($propertiesPath, $propertiesContent, [System.Text.Encoding]::UTF8)
        [System.IO.File]::WriteAllText($configPropertiesPath, $propertiesContent, [System.Text.Encoding]::UTF8)
        Write-Log "Application properties updated" "SUCCESS"
    }
    catch {
        Write-Log "Failed to update application.properties: $($_.Exception.Message)" "ERROR"
    }
    
    # Update environment variables
    try {
        Write-Log "Updating environment variables..." "INFO"
        $nssmPath = Join-Path $BIN_DIR "nssm.exe"
        if (Test-Path $nssmPath) {
            $envVars = @(
                "PUBLIC_TUNNEL_URL=https://$publicHostname",
                "ZERODHA_API_KEY=$ZerodhaApiKey",
                "ZERODHA_API_SECRET=$ZerodhaApiSecret",
                "ZERODHA_ENABLED=true"
            )
            
            if ($StaticIp) {
                $envVars += "BREEZE_API_STATIC_IP=$StaticIp"
            }
            
            $envVarsString = $envVars -join " "
            $process = Start-Process -FilePath $nssmPath -ArgumentList @("set", "ZerodhaDashboardBackend", "AppEnvironmentExtra", $envVarsString) -NoNewWindow -Wait -PassThru
            
            if ($process.ExitCode -eq 0) {
                Write-Log "Environment variables updated" "SUCCESS"
            }
        }
    }
    catch {
        Write-Log "Failed to update environment variables: $($_.Exception.Message)" "ERROR"
    }
    
    # Save installation metadata
    try {
        $metadataPath = Join-Path $INSTALL_DIR "installation-metadata.json"
        $metadata = @{
            publicHostname = $publicHostname
            tunnelId = $tunnelInfo.tunnelId
            customerId = $tunnelInfo.customerId
            machineId = $tunnelInfo.machineId
            installedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        } | ConvertTo-Json -Depth 10
        
        [System.IO.File]::WriteAllText($metadataPath, $metadata, [System.Text.Encoding]::UTF8)
        Write-Log "Installation metadata saved" "SUCCESS"
    }
    catch {
        Write-Log "Failed to save metadata: $($_.Exception.Message)" "ERROR"
    }
    
    Write-Log "========================================" "INFO"
    Write-Log "Installation completed successfully!" "SUCCESS"
    Write-Log "========================================" "INFO"
    
    exit 0
}
catch {
    Write-Log "Installation failed: $($_.Exception.Message)" "ERROR"
    exit 1
}

