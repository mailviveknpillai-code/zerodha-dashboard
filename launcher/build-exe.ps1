# Build EXE from launcher JAR using Launch4j
$ErrorActionPreference = "Stop"

Write-Host "`n=== Building Dashboard Launcher EXE ===" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if launcher JAR exists
$launcherJar = Get-ChildItem "target\dashboard-launcher-*.jar" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $launcherJar) {
    Write-Host "❌ Launcher JAR not found. Run build-launcher.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found launcher JAR: $($launcherJar.Name)" -ForegroundColor Green

# Find Launch4j
$launch4j = $null
$launch4jPaths = @(
    "C:\vivek\New folder\Launch4j\launch4jc.exe",
    "${env:ProgramFiles}\Launch4j\launch4jc.exe",
    "${env:ProgramFiles(x86)}\Launch4j\launch4jc.exe"
)

foreach ($path in $launch4jPaths) {
    if (Test-Path $path) {
        $launch4j = $path
        break
    }
}

if (-not $launch4j) {
    Write-Host "❌ Launch4j not found. Expected at: C:\vivek\New folder\Launch4j\launch4jc.exe" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found Launch4j: $launch4j" -ForegroundColor Green

# Create dist directory
$distDir = Join-Path $scriptDir "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

# Build EXE
Write-Host "`nBuilding EXE..." -ForegroundColor Yellow
$configFile = Join-Path $scriptDir "launch4j-config.xml"

try {
    $process = Start-Process -FilePath $launch4j -ArgumentList "`"$configFile`"" -Wait -NoNewWindow -PassThru
    
    if ($process.ExitCode -eq 0) {
        $exeFile = Join-Path $distDir "ZerodhaDashboard.exe"
        if (Test-Path $exeFile) {
            $size = [math]::Round((Get-Item $exeFile).Length / 1KB, 2)
            Write-Host "`n✅ EXE built successfully!" -ForegroundColor Green
            Write-Host "   File: $exeFile" -ForegroundColor White
            Write-Host "   Size: $size KB" -ForegroundColor White
            Write-Host "`nNote: This EXE requires:" -ForegroundColor Yellow
            Write-Host "  - Java 21 installed" -ForegroundColor Gray
            Write-Host "  - Backend JAR in same directory or subdirectory" -ForegroundColor Gray
            Write-Host "  - cloudflared.exe accessible" -ForegroundColor Gray
        } else {
            Write-Host "`n⚠ EXE file not found after build" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`n❌ Build failed with exit code: $($process.ExitCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error building EXE: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Done ===" -ForegroundColor Green


