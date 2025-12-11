# Rebuild app.asar with fixed Electron files
Write-Host "`n=== Rebuilding app.asar ===" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$electronDir = Join-Path $scriptDir "electron-launcher"
$asarFile = Join-Path $scriptDir "bin\resources\app.asar"
$tempDir = "$env:TEMP\rebuild-asar-$(Get-Random)"

# Check if electron-launcher files exist
if (-not (Test-Path "$electronDir\main.js")) {
    Write-Host "ERROR: main.js not found in $electronDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$electronDir\preload.js")) {
    Write-Host "ERROR: preload.js not found in $electronDir" -ForegroundColor Red
    exit 1
}

# Create temp directory
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Write-Host "Created temp directory: $tempDir" -ForegroundColor Green

# Copy main.js and preload.js
Copy-Item "$electronDir\main.js" "$tempDir\main.js" -Force
Copy-Item "$electronDir\preload.js" "$tempDir\preload.js" -Force
Write-Host "Copied main.js and preload.js" -ForegroundColor Green

# Copy package.json if it exists in electron-launcher, otherwise create one
if (Test-Path "$electronDir\package.json") {
    Copy-Item "$electronDir\package.json" "$tempDir\package.json" -Force
} else {
    $packageJson = @{
        name = "zerodha-dashboard-launcher"
        version = "1.0.0"
        description = "Zerodha Dashboard Electron Launcher"
        main = "main.js"
        dependencies = @{
            axios = "^1.6.0"
        }
    } | ConvertTo-Json
    Set-Content -Path "$tempDir\package.json" -Value $packageJson
    Write-Host "Created package.json" -ForegroundColor Green
}

# Copy node_modules if they exist
if (Test-Path "$electronDir\node_modules") {
    Write-Host "Copying node_modules..." -ForegroundColor Yellow
    $nodeModulesDest = Join-Path $tempDir "node_modules"
    Copy-Item "$electronDir\node_modules" $nodeModulesDest -Recurse -Force
    $packageCount = (Get-ChildItem $nodeModulesDest -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Host "Copied node_modules ($packageCount packages)" -ForegroundColor Green
} else {
    Write-Host "WARNING: node_modules not found in $electronDir" -ForegroundColor Yellow
}

# Check if asar package is available
Write-Host "`nChecking for asar package..." -ForegroundColor Yellow
try {
    $asarCheck = & npm list -g asar 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installing asar globally..." -ForegroundColor Yellow
        & npm install -g asar 2>&1 | Out-Null
    }
} catch {
    Write-Host "Installing asar globally..." -ForegroundColor Yellow
    & npm install -g asar 2>&1 | Out-Null
}

# Pack app.asar
Write-Host "`nPacking app.asar..." -ForegroundColor Yellow
$backupAsar = "$asarFile.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (Test-Path $asarFile) {
    Copy-Item $asarFile $backupAsar -Force
    Write-Host "Backed up existing app.asar to: $backupAsar" -ForegroundColor Green
}

try {
    & asar pack "$tempDir" "$asarFile" 2>&1 | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    
    if (Test-Path $asarFile) {
        $size = (Get-Item $asarFile).Length / 1KB
        Write-Host "`n✅ app.asar rebuilt successfully!" -ForegroundColor Green
        Write-Host "   Size: $([math]::Round($size, 2)) KB" -ForegroundColor White
        Write-Host "   Location: $asarFile" -ForegroundColor White
    } else {
        Write-Host "`n❌ Failed to create app.asar" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error packing app.asar: $_" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan

