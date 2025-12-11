# Build installer - searches for Inno Setup and builds
$ErrorActionPreference = "Stop"

Write-Host "`n=== Building Zerodha Dashboard Installer ===" -ForegroundColor Cyan

# Search for ISCC.exe
# Primary location: Custom tools directory
$searchPaths = @(
    "C:\vivek\New folder\Inno Setup 6\ISCC.exe",  # Custom tools location
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 5\ISCC.exe",
    "C:\Program Files\Inno Setup 5\ISCC.exe"
)

# Also search in Program Files directories
$basePaths = @("C:\Program Files (x86)", "C:\Program Files", "${env:ProgramFiles(x86)}", "${env:ProgramFiles}")
foreach ($base in $basePaths) {
    if (Test-Path $base) {
        $innoDirs = Get-ChildItem -Path $base -Filter "*Inno*" -Directory -ErrorAction SilentlyContinue
        foreach ($dir in $innoDirs) {
            $iscc = Join-Path $dir.FullName "ISCC.exe"
            if (Test-Path $iscc) {
                $searchPaths += $iscc
            }
        }
    }
}

$iscc = $null
foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        $iscc = $path
        break
    }
}

if (-not $iscc) {
    Write-Host "❌ Inno Setup compiler (ISCC.exe) not found!" -ForegroundColor Red
    Write-Host "`nPlease ensure Inno Setup is fully installed." -ForegroundColor Yellow
    Write-Host "Common locations:" -ForegroundColor Cyan
    Write-Host "  - C:\Program Files (x86)\Inno Setup 6\ISCC.exe" -ForegroundColor Gray
    Write-Host "  - C:\Program Files\Inno Setup 6\ISCC.exe" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Found Inno Setup: $iscc" -ForegroundColor Green

# Check for installer.iss
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$issPath = Join-Path $scriptDir "installer.iss"

if (-not (Test-Path $issPath)) {
    Write-Host "❌ installer.iss not found at: $issPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found installer script: $issPath" -ForegroundColor Green

# Verify fixed app.asar exists
$asarPath = Join-Path $scriptDir "bin\resources\app.asar"
if (-not (Test-Path $asarPath)) {
    Write-Host "⚠ Warning: Fixed app.asar not found at: $asarPath" -ForegroundColor Yellow
    Write-Host "  Run rebuild-app-asar.ps1 first to create it." -ForegroundColor Yellow
} else {
    $asarSize = (Get-Item $asarPath).Length / 1KB
    Write-Host "✅ Fixed app.asar found: $([math]::Round($asarSize, 2)) KB" -ForegroundColor Green
}

# Build
Write-Host "`n=== Building Installer ===" -ForegroundColor Cyan
Write-Host "This may take a few minutes...`n" -ForegroundColor Gray

try {
    $process = Start-Process -FilePath $iscc -ArgumentList "`"$issPath`"" -Wait -NoNewWindow -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-Host "`n✅ Installer built successfully!" -ForegroundColor Green
        
        $distDir = Join-Path $scriptDir "dist"
        $installerFile = Get-ChildItem -Path $distDir -Filter "ZerodhaDashboard-Setup-1.1.0.exe" -ErrorAction SilentlyContinue
        
        if ($installerFile) {
            $size = [math]::Round($installerFile.Length / 1MB, 2)
            Write-Host "`nInstaller Details:" -ForegroundColor Cyan
            Write-Host "   File: $($installerFile.FullName)" -ForegroundColor White
            Write-Host "   Size: $size MB" -ForegroundColor White
            Write-Host "   Version: 1.1.0" -ForegroundColor White
            Write-Host "`n✅ Ready to use!" -ForegroundColor Green
        } else {
            Write-Host "⚠ Installer file not found in dist directory" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`n❌ Build failed with exit code: $($process.ExitCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error building installer: $_" -ForegroundColor Red
    exit 1
}

