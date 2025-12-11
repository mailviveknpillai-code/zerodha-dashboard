# Build backend JAR with embedded frontend
$ErrorActionPreference = "Stop"

Write-Host "`n=== Building Backend with Embedded Frontend ===" -ForegroundColor Cyan

# Step 1: Build frontend
Write-Host "`n[1/4] Building frontend..." -ForegroundColor Yellow
Set-Location "frontend\dashboard-ui"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
    & npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend dependency installation failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Building frontend (Vite)..." -ForegroundColor Gray
# Build for production with API base URL pointing to same origin
$env:VITE_API_BASE_URL = ""
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}

Write-Host "✅ Frontend built successfully" -ForegroundColor Green
Set-Location ..\..

# Step 2: Copy frontend to backend resources
Write-Host "`n[2/4] Embedding frontend in backend..." -ForegroundColor Yellow
$frontendDist = "frontend\dashboard-ui\dist"
$backendStatic = "backend\dashboard\src\main\resources\static"

if (-not (Test-Path $frontendDist)) {
    Write-Host "❌ Frontend dist directory not found: $frontendDist" -ForegroundColor Red
    exit 1
}

# Remove old static files
if (Test-Path $backendStatic) {
    Remove-Item "$backendStatic\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $backendStatic -Force | Out-Null
}

# Copy frontend files
Write-Host "Copying frontend files to backend resources..." -ForegroundColor Gray
Copy-Item "$frontendDist\*" $backendStatic -Recurse -Force
Write-Host "✅ Frontend embedded in backend" -ForegroundColor Green

# Step 3: Build backend JAR
Write-Host "`n[3/4] Building backend JAR..." -ForegroundColor Yellow
Set-Location backend

# Check for Maven
$mvn = $null
$mvnPaths = @("mvn", "mvnw.cmd", ".\mvnw.cmd")
foreach ($path in $mvnPaths) {
    try {
        $result = Get-Command $path -ErrorAction SilentlyContinue
        if ($result) {
            $mvn = $path
            break
        }
    } catch {
        # Continue
    }
}

if (-not $mvn) {
    Write-Host "❌ Maven not found. Please install Maven or use mvnw" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "Building backend with Maven..." -ForegroundColor Gray
& $mvn clean package -DskipTests
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

$jarFile = Get-ChildItem "dashboard\target\dashboard-app-*.jar" | 
    Where-Object { $_.Name -notlike "*sources*" } | 
    Select-Object -First 1

if ($jarFile) {
    $size = [math]::Round($jarFile.Length / 1MB, 2)
    Write-Host "✅ Backend JAR built: $($jarFile.Name) ($size MB)" -ForegroundColor Green
} else {
    Write-Host "❌ Backend JAR not found" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Step 4: Copy JAR to launcher directory
Write-Host "`n[4/4] Preparing launcher directory..." -ForegroundColor Yellow
$launcherDir = "launcher"
$launcherLib = Join-Path $launcherDir "lib"

if (-not (Test-Path $launcherLib)) {
    New-Item -ItemType Directory -Path $launcherLib -Force | Out-Null
}

Copy-Item $jarFile.FullName $launcherLib -Force
Write-Host "✅ Backend JAR copied to launcher/lib" -ForegroundColor Green

Write-Host "`n=== Build Complete ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. cd launcher" -ForegroundColor White
Write-Host "  2. .\build-launcher.ps1" -ForegroundColor White
Write-Host "  3. .\build-exe.ps1" -ForegroundColor White
Write-Host "`nThe backend JAR now includes the frontend!" -ForegroundColor Yellow





