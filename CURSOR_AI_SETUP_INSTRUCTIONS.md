# Cursor AI - Environment Setup Instructions

## Overview
This document provides step-by-step instructions for Cursor AI to set up the complete development and runtime environment for the Zerodha Dashboard application.

## Prerequisites Check

### 1. Check Java Installation
```powershell
java -version
```
**Expected:** `openjdk version "21"` or similar
**If missing:** Install Java 21 from https://adoptium.net/

### 2. Check Node.js Installation
```powershell
node -v
npm -v
```
**Expected:** Node.js 20+ and npm 9+
**If missing:** Install Node.js from https://nodejs.org/

### 3. Check Maven Installation
```powershell
mvn -v
```
**Expected:** Maven 3.6+
**If missing:** Install Maven or use `mvnw` wrapper in backend directory

### 4. Check Redis Installation
```powershell
redis-cli ping
```
**Expected:** `PONG`
**If missing:** Install Redis for Windows or use Docker:
```powershell
docker run -d -p 6379:6379 --name zerodha-redis redis:7-alpine
```

### 5. Check Docker (Optional but Recommended)
```powershell
docker --version
```
**If available:** Can use Docker for Redis and other services

---

## Environment Setup Steps

### Step 1: Clone/Verify Repository Structure
```powershell
# Verify directory structure exists
Test-Path "backend"
Test-Path "frontend/dashboard-ui"
Test-Path "launcher"
```

### Step 2: Setup Backend Environment

#### 2.1 Install Backend Dependencies
```powershell
cd backend
# Use Maven wrapper if available
if (Test-Path "mvnw.cmd") {
    .\mvnw.cmd dependency:resolve
} else {
    mvn dependency:resolve
}
```

#### 2.2 Verify Backend Configuration
```powershell
# Check application.properties exists
Test-Path "dashboard/src/main/resources/application.properties"

# Verify Redis configuration
Get-Content "dashboard/src/main/resources/application.properties" | Select-String "redis"
```

#### 2.3 Build Backend
```powershell
cd backend
if (Test-Path "mvnw.cmd") {
    .\mvnw.cmd clean package -DskipTests
} else {
    mvn clean package -DskipTests
}

# Verify JAR created
Test-Path "dashboard/target/dashboard-app-*.jar"
```

### Step 3: Setup Frontend Environment

#### 3.1 Install Frontend Dependencies
```powershell
cd frontend/dashboard-ui
npm install --legacy-peer-deps

# Verify node_modules created
Test-Path "node_modules"
```

#### 3.2 Verify Frontend Configuration
```powershell
# Check package.json exists
Test-Path "package.json"

# Check vite.config.js exists
Test-Path "vite.config.js"
```

#### 3.3 Build Frontend (Optional - for testing)
```powershell
cd frontend/dashboard-ui
npm run build

# Verify dist folder created
Test-Path "dist"
```

### Step 4: Setup Launcher Environment

#### 4.1 Verify Launcher Structure
```powershell
cd launcher
Test-Path "src/main/java/com/zerodha/launcher/DashboardLauncher.java"
Test-Path "pom.xml"
```

#### 4.2 Build Launcher
```powershell
cd launcher
mvn clean package -DskipTests

# Verify launcher JAR created
Test-Path "target/dashboard-launcher-*.jar"
```

### Step 5: Setup Required Tools

#### 5.1 Check for Cloudflared
```powershell
# Check common locations
$cloudflaredPaths = @(
    "C:\vivek\New folder\cloudflared.exe",
    "cloudflared.exe",
    (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
)

foreach ($path in $cloudflaredPaths) {
    if (Test-Path $path) {
        Write-Host "Found cloudflared at: $path"
        break
    }
}
```

#### 5.2 Check for Launch4j (for EXE building)
```powershell
$launch4j = "C:\vivek\New folder\Launch4j\launch4jc.exe"
if (Test-Path $launch4j) {
    Write-Host "Launch4j found at: $launch4j"
} else {
    Write-Host "Launch4j not found - EXE building will not work"
}
```

### Step 6: Verify Redis is Running

#### 6.1 Check Redis Service
```powershell
# Check if Redis is running
try {
    $response = redis-cli ping
    if ($response -eq "PONG") {
        Write-Host "Redis is running"
    }
} catch {
    Write-Host "Redis is not running - starting Redis..."
    
    # Try to start Redis
    if (Get-Command redis-server -ErrorAction SilentlyContinue) {
        Start-Process redis-server -WindowStyle Hidden
        Start-Sleep -Seconds 2
    } elseif (Get-Command docker -ErrorAction SilentlyContinue) {
        docker start zerodha-redis 2>$null
        if ($LASTEXITCODE -ne 0) {
            docker run -d -p 6379:6379 --name zerodha-redis redis:7-alpine
        }
    }
}
```

### Step 7: Environment Variables Setup

#### 7.1 Create .env file (if needed)
```powershell
# Check if .env exists
if (-not (Test-Path ".env")) {
    @"
# Zerodha API Configuration
ZERODHA_API_KEY=your-api-key-here
ZERODHA_API_SECRET=your-api-secret-here

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Server Configuration
SERVER_PORT=9000

# Tunnel Configuration (auto-generated)
PUBLIC_TUNNEL_URL=
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "Created .env file - please update with your credentials"
}
```

### Step 8: Verify Complete Setup

#### 8.1 Run Setup Verification Script
```powershell
Write-Host "=== Environment Setup Verification ===" -ForegroundColor Cyan

# Check Java
$javaVersion = java -version 2>&1 | Select-String "version"
Write-Host "Java: $javaVersion" -ForegroundColor $(if ($javaVersion) { "Green" } else { "Red" })

# Check Node.js
$nodeVersion = node -v
Write-Host "Node.js: $nodeVersion" -ForegroundColor $(if ($nodeVersion) { "Green" } else { "Red" })

# Check Maven
$mvnVersion = mvn -v 2>&1 | Select-String "Apache Maven"
Write-Host "Maven: $mvnVersion" -ForegroundColor $(if ($mvnVersion) { "Green" } else { "Yellow" })

# Check Redis
try {
    $redisPing = redis-cli ping 2>&1
    Write-Host "Redis: $redisPing" -ForegroundColor $(if ($redisPing -eq "PONG") { "Green" } else { "Red" })
} catch {
    Write-Host "Redis: Not running" -ForegroundColor Red
}

# Check Backend JAR
$backendJar = Get-ChildItem "backend/dashboard/target/dashboard-app-*.jar" -ErrorAction SilentlyContinue
Write-Host "Backend JAR: $(if ($backendJar) { "Found" } else { "Not found" })" -ForegroundColor $(if ($backendJar) { "Green" } else { "Yellow" })

# Check Frontend build
$frontendDist = Test-Path "frontend/dashboard-ui/dist"
Write-Host "Frontend build: $(if ($frontendDist) { "Built" } else { "Not built" })" -ForegroundColor $(if ($frontendDist) { "Green" } else { "Yellow" })

# Check Launcher JAR
$launcherJar = Get-ChildItem "launcher/target/dashboard-launcher-*.jar" -ErrorAction SilentlyContinue
Write-Host "Launcher JAR: $(if ($launcherJar) { "Found" } else { "Not found" })" -ForegroundColor $(if ($launcherJar) { "Green" } else { "Yellow" })

Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
```

---

## Quick Setup Script

Create a file `setup-environment.ps1` with all the above steps:

```powershell
# Complete Environment Setup Script
$ErrorActionPreference = "Continue"

Write-Host "`n=== Zerodha Dashboard - Environment Setup ===" -ForegroundColor Cyan

# Step 1: Check Prerequisites
Write-Host "`n[1/8] Checking Prerequisites..." -ForegroundColor Yellow

# Java
if (Get-Command java -ErrorAction SilentlyContinue) {
    $javaVer = java -version 2>&1 | Select-String "version"
    Write-Host "  ✓ Java: $javaVer" -ForegroundColor Green
} else {
    Write-Host "  ✗ Java not found - Please install Java 21" -ForegroundColor Red
}

# Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host "  ✓ Node.js: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found - Please install Node.js 20+" -ForegroundColor Red
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
    }
} catch {
    Write-Host "  ⚠ Redis: Not found or not running" -ForegroundColor Yellow
    Write-Host "    Start with: docker run -d -p 6379:6379 redis:7-alpine" -ForegroundColor Gray
}

# Step 2: Setup Backend
Write-Host "`n[2/8] Setting up Backend..." -ForegroundColor Yellow
Set-Location backend
if (Test-Path "mvnw.cmd") {
    .\mvnw.cmd dependency:resolve -q
    Write-Host "  ✓ Backend dependencies resolved" -ForegroundColor Green
} else {
    mvn dependency:resolve -q 2>$null
    Write-Host "  ✓ Backend dependencies resolved" -ForegroundColor Green
}
Set-Location ..

# Step 3: Setup Frontend
Write-Host "`n[3/8] Setting up Frontend..." -ForegroundColor Yellow
Set-Location frontend/dashboard-ui
if (-not (Test-Path "node_modules")) {
    npm install --legacy-peer-deps --silent
    Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✓ Frontend dependencies already installed" -ForegroundColor Green
}
Set-Location ../..

# Step 4: Build Backend
Write-Host "`n[4/8] Building Backend..." -ForegroundColor Yellow
Set-Location backend
if (Test-Path "mvnw.cmd") {
    .\mvnw.cmd clean package -DskipTests -q
} else {
    mvn clean package -DskipTests -q
}
if (Test-Path "dashboard/target/dashboard-app-*.jar") {
    Write-Host "  ✓ Backend JAR built" -ForegroundColor Green
} else {
    Write-Host "  ✗ Backend build failed" -ForegroundColor Red
}
Set-Location ..

# Step 5: Build Frontend
Write-Host "`n[5/8] Building Frontend..." -ForegroundColor Yellow
Set-Location frontend/dashboard-ui
npm run build 2>&1 | Out-Null
if (Test-Path "dist") {
    Write-Host "  ✓ Frontend built" -ForegroundColor Green
} else {
    Write-Host "  ✗ Frontend build failed" -ForegroundColor Red
}
Set-Location ../..

# Step 6: Build Launcher
Write-Host "`n[6/8] Building Launcher..." -ForegroundColor Yellow
Set-Location launcher
mvn clean package -DskipTests -q 2>$null
if (Test-Path "target/dashboard-launcher-*.jar") {
    Write-Host "  ✓ Launcher JAR built" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Launcher build skipped (Maven not found)" -ForegroundColor Yellow
}
Set-Location ..

# Step 7: Create Deployment Package
Write-Host "`n[7/8] Creating Deployment Package..." -ForegroundColor Yellow
Set-Location launcher
if (Test-Path "create-client-package-fixed.ps1") {
    .\create-client-package-fixed.ps1 2>&1 | Out-Null
    Write-Host "  ✓ Deployment package created" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Deployment package script not found" -ForegroundColor Yellow
}
Set-Location ..

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
    }
} catch {
    Write-Host "  ⚠ Redis not running" -ForegroundColor Yellow
}

if ($allGood) {
    Write-Host "`n✅ Environment setup complete!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Start Redis (if not running)" -ForegroundColor White
    Write-Host "  2. Run: cd launcher\deployment" -ForegroundColor White
    Write-Host "  3. Run: .\ZerodhaDashboard.exe" -ForegroundColor White
} else {
    Write-Host "`n⚠ Setup incomplete - please install missing prerequisites" -ForegroundColor Yellow
}

Set-Location $PSScriptRoot
```

---

## Cursor AI Instructions

When asked to set up the environment, Cursor AI should:

1. **Check all prerequisites** using the verification script
2. **Install missing dependencies** (Java, Node.js, Maven if needed)
3. **Start Redis** (using Docker if available, otherwise guide user)
4. **Build all components** (backend, frontend, launcher)
5. **Create deployment package** using the client package script
6. **Verify everything works** by running the verification script

### Key Commands for Cursor AI:

```powershell
# Run complete setup
.\setup-environment.ps1

# Or step by step:
# 1. Check prerequisites
java -version; node -v; mvn -v; redis-cli ping

# 2. Setup backend
cd backend; .\mvnw.cmd clean package -DskipTests; cd ..

# 3. Setup frontend  
cd frontend/dashboard-ui; npm install --legacy-peer-deps; npm run build; cd ../..

# 4. Setup launcher
cd launcher; mvn clean package -DskipTests; cd ..

# 5. Create deployment
cd launcher; .\create-client-package-fixed.ps1; cd ..
```

---

## Troubleshooting for Cursor AI

If setup fails, Cursor AI should:

1. **Check error messages** and provide specific fixes
2. **Verify file paths** are correct
3. **Check permissions** (admin rights if needed)
4. **Verify network** connectivity for downloads
5. **Check disk space** for builds
6. **Verify Java/Node versions** match requirements

---

## Environment Variables Reference

Cursor AI should set or verify these environment variables:

- `JAVA_HOME` - Path to Java installation
- `MAVEN_HOME` - Path to Maven (if not using wrapper)
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `SERVER_PORT` - Backend port (default: 9000)





