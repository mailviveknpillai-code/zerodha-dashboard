# Complete Environment Setup Script for Zerodha Dashboard
# Cursor AI can run this to set up the entire environment

$ErrorActionPreference = "Continue"

Write-Host "`n=== Zerodha Dashboard - Environment Setup ===" -ForegroundColor Cyan

# Step 1: Check Prerequisites
Write-Host "`n[1/8] Checking Prerequisites..." -ForegroundColor Yellow

$prereqsOk = $true

# Java
if (Get-Command java -ErrorAction SilentlyContinue) {
    $javaVer = java -version 2>&1 | Select-String "version" | Select-Object -First 1
    Write-Host "  ✓ Java: $javaVer" -ForegroundColor Green
} else {
    Write-Host "  ✗ Java not found - Please install Java 21 from https://adoptium.net/" -ForegroundColor Red
    $prereqsOk = $false
}

# Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host "  ✓ Node.js: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found - Please install Node.js 20+ from https://nodejs.org/" -ForegroundColor Red
    $prereqsOk = $false
}

# Maven
if (Get-Command mvn -ErrorAction SilentlyContinue) {
    Write-Host "  ✓ Maven: Found" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Maven not found - Will use mvnw wrapper" -ForegroundColor Yellow
}

# Redis
try {
    $redisPing = redis-cli ping 2>&1
    if ($redisPing -eq "PONG") {
        Write-Host "  ✓ Redis: Running" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Redis: Not running" -ForegroundColor Yellow
        Write-Host "    Start with: docker run -d -p 6379:6379 --name zerodha-redis redis:7-alpine" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠ Redis: Not found or not running" -ForegroundColor Yellow
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "    Starting Redis with Docker..." -ForegroundColor Gray
        docker start zerodha-redis 2>$null
        if ($LASTEXITCODE -ne 0) {
            docker run -d -p 6379:6379 --name zerodha-redis redis:7-alpine 2>$null
            Start-Sleep -Seconds 2
        }
    } else {
        Write-Host "    Install Redis or Docker to run: docker run -d -p 6379:6379 redis:7-alpine" -ForegroundColor Gray
    }
}

if (-not $prereqsOk) {
    Write-Host "`n❌ Missing prerequisites. Please install them first." -ForegroundColor Red
    exit 1
}

# Step 2: Setup Backend
Write-Host "`n[2/8] Setting up Backend..." -ForegroundColor Yellow
if (Test-Path "backend") {
    Set-Location backend
    if (Test-Path "mvnw.cmd") {
        .\mvnw.cmd dependency:resolve -q 2>&1 | Out-Null
        Write-Host "  ✓ Backend dependencies resolved" -ForegroundColor Green
    } elseif (Get-Command mvn -ErrorAction SilentlyContinue) {
        mvn dependency:resolve -q 2>&1 | Out-Null
        Write-Host "  ✓ Backend dependencies resolved" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Maven not available - skipping dependency resolution" -ForegroundColor Yellow
    }
    Set-Location ..
} else {
    Write-Host "  ✗ Backend directory not found" -ForegroundColor Red
}

# Step 3: Setup Frontend
Write-Host "`n[3/8] Setting up Frontend..." -ForegroundColor Yellow
if (Test-Path "frontend/dashboard-ui") {
    Set-Location frontend/dashboard-ui
    if (-not (Test-Path "node_modules")) {
        Write-Host "  Installing frontend dependencies..." -ForegroundColor Gray
        npm install --legacy-peer-deps --silent 2>&1 | Out-Null
        Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Frontend dependencies already installed" -ForegroundColor Green
    }
    Set-Location ../..
} else {
    Write-Host "  ✗ Frontend directory not found" -ForegroundColor Red
}

# Step 4: Build Backend
Write-Host "`n[4/8] Building Backend..." -ForegroundColor Yellow
if (Test-Path "backend") {
    Set-Location backend
    if (Test-Path "mvnw.cmd") {
        .\mvnw.cmd clean package -DskipTests -q 2>&1 | Out-Null
    } elseif (Get-Command mvn -ErrorAction SilentlyContinue) {
        mvn clean package -DskipTests -q 2>&1 | Out-Null
    }
    $backendJar = Get-ChildItem "dashboard/target/dashboard-app-*.jar" -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike "*sources*" } | Select-Object -First 1
    if ($backendJar) {
        Write-Host "  ✓ Backend JAR built: $($backendJar.Name)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Backend JAR not found (build may have failed)" -ForegroundColor Yellow
    }
    Set-Location ..
} else {
    Write-Host "  ✗ Backend directory not found" -ForegroundColor Red
}

# Step 5: Build Frontend
Write-Host "`n[5/8] Building Frontend..." -ForegroundColor Yellow
if (Test-Path "frontend/dashboard-ui") {
    Set-Location frontend/dashboard-ui
    npm run build 2>&1 | Out-Null
    if (Test-Path "dist") {
        Write-Host "  ✓ Frontend built" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Frontend build may have failed" -ForegroundColor Yellow
    }
    Set-Location ../..
} else {
    Write-Host "  ✗ Frontend directory not found" -ForegroundColor Red
}

# Step 6: Build Launcher
Write-Host "`n[6/8] Building Launcher..." -ForegroundColor Yellow
if (Test-Path "launcher") {
    Set-Location launcher
    if (Get-Command mvn -ErrorAction SilentlyContinue) {
        mvn clean package -DskipTests -q 2>&1 | Out-Null
        $launcherJar = Get-ChildItem "target/dashboard-launcher-*.jar" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($launcherJar) {
            Write-Host "  ✓ Launcher JAR built: $($launcherJar.Name)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Launcher JAR not found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠ Maven not found - skipping launcher build" -ForegroundColor Yellow
    }
    Set-Location ..
} else {
    Write-Host "  ⚠ Launcher directory not found" -ForegroundColor Yellow
}

# Step 7: Create Deployment Package
Write-Host "`n[7/8] Creating Deployment Package..." -ForegroundColor Yellow
if (Test-Path "launcher/create-client-package-fixed.ps1") {
    Set-Location launcher
    .\create-client-package-fixed.ps1 2>&1 | Out-Null
    if (Test-Path "client-package") {
        Write-Host "  ✓ Deployment package created" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Deployment package creation may have failed" -ForegroundColor Yellow
    }
    Set-Location ..
} else {
    Write-Host "  ⚠ Deployment package script not found" -ForegroundColor Yellow
}

# Step 8: Final Verification
Write-Host "`n[8/8] Final Verification..." -ForegroundColor Yellow

$allGood = $true

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "  ✗ Java not installed" -ForegroundColor Red
    $allGood = $false
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  ✗ Node.js not installed" -ForegroundColor Red
    $allGood = $false
}

try {
    $redisPing = redis-cli ping 2>&1
    if ($redisPing -ne "PONG") {
        Write-Host "  ⚠ Redis not running" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ Redis is running" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Redis not running" -ForegroundColor Yellow
}

if ($allGood) {
    Write-Host "`n✅ Environment setup complete!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Ensure Redis is running" -ForegroundColor White
    Write-Host "  2. Navigate to: launcher\deployment" -ForegroundColor White
    Write-Host "  3. Run: .\ZerodhaDashboard.exe" -ForegroundColor White
    Write-Host "`nOr use the launcher directly:" -ForegroundColor Cyan
    Write-Host "  cd launcher\client-package" -ForegroundColor White
    Write-Host "  .\ZerodhaDashboard.exe" -ForegroundColor White
} else {
    Write-Host "`n⚠ Setup incomplete - please install missing prerequisites" -ForegroundColor Yellow
}

Set-Location $PSScriptRoot





