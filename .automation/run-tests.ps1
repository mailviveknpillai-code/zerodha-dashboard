Write-Host "Checking prerequisites..."

# Verify docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "Docker is not installed or not on PATH."
  exit 1
}

# Verify docker-compose is available
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
  Write-Error "docker-compose is not installed or not on PATH."
  exit 1
}

Write-Host "Starting Redis service via docker-compose..."
docker compose up -d redis

# Define local module path
$modulePath = "C:\vivek\freelance\zerodha-dashboard\backend\dashboard"

# Confirm path exists
if (-not (Test-Path $modulePath)) {
  Write-Error "Path not found: $modulePath"
  exit 1
}

Write-Host "Running Maven tests inside container..."
docker run --rm `
  -v "${modulePath}:/app" `
  -w /app `
  --network backend_default `
  -e REDIS_HOST=redis `
  -e REDIS_PORT=6379 `
  -e TESTCONTAINERS_DISABLED=true `
  -e SPRING_TESTCONTAINERS_ENABLED=false `
  maven:3.9.6-eclipse-temurin-21 `
  mvn -B -DskipTests=false test

if ($LASTEXITCODE -eq 0) {
  Write-Host "Build and tests completed successfully."
} else {
  Write-Host "Tests failed with exit code $LASTEXITCODE."
  exit $LASTEXITCODE
}