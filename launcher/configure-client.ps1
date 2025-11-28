# Client Configuration Tool
# Updates client-specific settings in the backend JAR

param(
    [string]$ZerodhaApiKey = "",
    [string]$ZerodhaApiSecret = "",
    [string]$StaticIp = "",
    [string]$NetworkInterface = "eth0"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Zerodha Dashboard - Client Configuration ===" -ForegroundColor Cyan
Write-Host "This tool updates client-specific settings in the application." -ForegroundColor Yellow
Write-Host ""

# Find backend JAR
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$jarFile = $null

# Search in multiple locations
$searchPaths = @(
    (Join-Path $scriptDir "dashboard-app-*.jar"),  # Current directory
    (Join-Path $scriptDir "lib\dashboard-app-*.jar"),  # lib subdirectory
    (Join-Path $scriptDir "client-package\dashboard-app-*.jar"),  # client-package subdirectory
    (Join-Path (Split-Path $scriptDir -Parent) "backend\dashboard\target\dashboard-app-*.jar")  # Backend target
)

foreach ($searchPath in $searchPaths) {
    $jarFile = Get-ChildItem $searchPath -ErrorAction SilentlyContinue | 
        Where-Object { $_.Name -notlike "*sources*" } | 
        Select-Object -First 1
    if ($jarFile) {
        break
    }
}

if (-not $jarFile) {
    Write-Host "Backend JAR not found" -ForegroundColor Red
    Write-Host "   Searched in:" -ForegroundColor Yellow
    foreach ($path in $searchPaths) {
        Write-Host "     - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "   Please ensure the backend JAR is in one of these locations:" -ForegroundColor Yellow
    Write-Host "     - launcher\lib\dashboard-app-*.jar" -ForegroundColor White
    Write-Host "     - launcher\client-package\dashboard-app-*.jar" -ForegroundColor White
    Write-Host "     - Current directory" -ForegroundColor White
    exit 1
}

Write-Host "Found: $($jarFile.Name)" -ForegroundColor Green

# Get client information
if (-not $ZerodhaApiKey) {
    Write-Host ""
    Write-Host "Enter Zerodha API Credentials:" -ForegroundColor Cyan
    $ZerodhaApiKey = Read-Host "Zerodha API Key"
    $ZerodhaApiSecret = Read-Host "Zerodha API Secret" -AsSecureString
    $ZerodhaApiSecret = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ZerodhaApiSecret)
    )
}

if (-not $StaticIp) {
    Write-Host ""
    Write-Host "Enter Network Configuration:" -ForegroundColor Cyan
    $StaticIp = Read-Host "Static IP Address (or press Enter to skip)"
    if ($StaticIp) {
        $NetworkInterface = Read-Host "Network Interface (default: eth0)" 
        if (-not $NetworkInterface) { $NetworkInterface = "eth0" }
    }
}

# Create temporary directory for JAR extraction
$tempDir = Join-Path $env:TEMP "zerodha-config-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    Write-Host ""
    Write-Host "Updating configuration..." -ForegroundColor Yellow
    
    # Extract JAR (it's a ZIP file)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($jarFile.FullName, $tempDir)
    
    # Update application.properties
    $propsFile = Join-Path $tempDir "BOOT-INF\classes\application.properties"
    if (-not (Test-Path $propsFile)) {
        throw "application.properties not found in JAR"
    }
    
    $content = Get-Content $propsFile -Raw
    
    # Update Zerodha credentials
    if ($ZerodhaApiKey) {
        $content = $content -replace 'zerodha\.apikey=.*', "zerodha.apikey=$ZerodhaApiKey"
        $content = $content -replace 'zerodha\.apisecret=.*', "zerodha.apisecret=$ZerodhaApiSecret"
        Write-Host "  Updated Zerodha API credentials" -ForegroundColor Green
    }
    
    # Update static IP if provided
    if ($StaticIp) {
        $content = $content -replace 'breeze\.api\.static\.ip=.*', "breeze.api.static.ip=$StaticIp"
        $content = $content -replace 'breeze\.api\.network\.interface=.*', "breeze.api.network.interface=$NetworkInterface"
        Write-Host "  Updated static IP: $StaticIp" -ForegroundColor Green
    }
    
    # Save updated properties
    Set-Content -Path $propsFile -Value $content -NoNewline
    
    # Recreate JAR
    $backupJar = "$($jarFile.FullName).backup"
    Copy-Item $jarFile.FullName $backupJar -Force
    Write-Host "  Created backup: $(Split-Path $backupJar -Leaf)" -ForegroundColor Gray
    
    # Remove old JAR
    Remove-Item $jarFile.FullName -Force
    
    # Create new JAR
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $jarFile.FullName)
    
    Write-Host ""
    Write-Host "Configuration updated successfully!" -ForegroundColor Green
    Write-Host "   Updated JAR: $($jarFile.Name)" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "Error updating configuration: $_" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Configuration complete. The application is ready to use." -ForegroundColor Cyan
