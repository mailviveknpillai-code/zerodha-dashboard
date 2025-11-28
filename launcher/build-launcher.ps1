# Build the dashboard launcher JAR
$ErrorActionPreference = "Stop"

Write-Host "`n=== Building Dashboard Launcher ===" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check for Maven
$mvn = $null
$mvnPaths = @(
    "mvn",
    "$env:MAVEN_HOME\bin\mvn.cmd",
    "C:\Program Files\Apache\Maven\bin\mvn.cmd"
)

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
    Write-Host "❌ Maven not found. Please install Maven or set MAVEN_HOME" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found Maven: $mvn" -ForegroundColor Green

# Build launcher
Write-Host "`nBuilding launcher JAR..." -ForegroundColor Yellow
try {
    & $mvn clean package -DskipTests
    if ($LASTEXITCODE -eq 0) {
        $jarFile = Get-ChildItem "target\dashboard-launcher-*.jar" | Select-Object -First 1
        if ($jarFile) {
            Write-Host "`n✅ Launcher built successfully!" -ForegroundColor Green
            Write-Host "   File: $($jarFile.FullName)" -ForegroundColor White
            Write-Host "   Size: $([math]::Round($jarFile.Length / 1KB, 2)) KB" -ForegroundColor White
        }
    } else {
        Write-Host "`n❌ Build failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error building: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Done ===" -ForegroundColor Green


