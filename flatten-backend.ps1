#!/usr/bin/env pwsh
# PowerShell script to flatten backend module structure
# This script moves files from backend/dashboard/ to backend/ and updates configurations

param(
    [string]$FeatureBranch = "feature/phase1-redis-impl-flatten",
    [string]$CommitMsg = "chore(repo): flatten backend module to backend/ (move dashboard/* -> backend)",
    [string]$Remote = "origin"
)

Write-Host "1) Ensure clean working tree" -ForegroundColor Green
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "ERROR: working tree not clean. Committing current changes first..." -ForegroundColor Red
    git add -A
    git commit -m "chore: commit changes before flattening"
}

Write-Host "2) Create and switch to feature branch" -ForegroundColor Green
git checkout -b $FeatureBranch

Write-Host "3) Show existing backend layout:" -ForegroundColor Green
Get-ChildItem -Path "backend" -Force
Write-Host "Contents of backend/dashboard:"
Get-ChildItem -Path "backend/dashboard" -Force

Write-Host "4) Move files from backend/dashboard up to backend" -ForegroundColor Green

# Move all files and directories from backend/dashboard to backend
$items = Get-ChildItem -Path "backend/dashboard" -Force
foreach ($item in $items) {
    $sourcePath = $item.FullName
    $destPath = Join-Path "backend" $item.Name
    
    Write-Host "Moving: $($item.Name)"
    
    if ($item.PSIsContainer) {
        # Directory
        if (Test-Path $destPath) {
            Write-Host "  Directory $($item.Name) already exists in backend, merging contents..."
            # Copy contents and remove source
            Copy-Item -Path "$sourcePath\*" -Destination $destPath -Recurse -Force
            Remove-Item -Path $sourcePath -Recurse -Force
        } else {
            Move-Item -Path $sourcePath -Destination $destPath
        }
    } else {
        # File
        if (Test-Path $destPath) {
            Write-Host "  File $($item.Name) already exists in backend, overwriting..."
            Remove-Item -Path $destPath -Force
        }
        Move-Item -Path $sourcePath -Destination $destPath
    }
}

# Remove empty dashboard directory
if (Test-Path "backend/dashboard") {
    $remainingItems = Get-ChildItem -Path "backend/dashboard" -Force
    if ($remainingItems.Count -eq 0) {
        Remove-Item -Path "backend/dashboard" -Force
        Write-Host "Removed empty backend/dashboard directory"
    } else {
        Write-Host "Warning: backend/dashboard directory not empty, remaining items:"
        $remainingItems | ForEach-Object { Write-Host "  $($_.Name)" }
    }
}

Write-Host "5) Update docker-compose.yml files" -ForegroundColor Green

# Update root docker-compose.yml
if (Test-Path "docker-compose.yml") {
    $content = Get-Content "docker-compose.yml" -Raw
    $content = $content -replace 'context: ./backend/dashboard', 'context: ./backend'
    $content = $content -replace 'working_dir: /app/dashboard', 'working_dir: /app'
    $content = $content -replace '- ./dashboard:/app:cached', '- ./backend:/app:cached'
    Set-Content "docker-compose.yml" $content
    Write-Host "Updated docker-compose.yml"
}

# Update backend docker-compose.yml
if (Test-Path "backend/docker-compose.yml") {
    $content = Get-Content "backend/docker-compose.yml" -Raw
    $content = $content -replace 'context: ./backend/dashboard', 'context: ./backend'
    $content = $content -replace 'context: ./dashboard', 'context: ./backend'
    $content = $content -replace 'working_dir: /app/dashboard', 'working_dir: /app'
    $content = $content -replace '- ./dashboard:/app:cached', '- ./backend:/app:cached'
    Set-Content "backend/docker-compose.yml" $content
    Write-Host "Updated backend/docker-compose.yml"
}

Write-Host "6) Update CI workflow if it exists" -ForegroundColor Green
$ciFile = ".github/workflows/ci.yml"
if (Test-Path $ciFile) {
    $content = Get-Content $ciFile -Raw
    $content = $content -replace 'working-directory: backend/dashboard', 'working-directory: backend'
    $content = $content -replace "java-version: '17'", "java-version: '21'"
    $content = $content -replace "Set up JDK 17", "Set up JDK 21"
    Set-Content $ciFile $content
    Write-Host "Updated $ciFile"
} else {
    Write-Host "CI file $ciFile not found; skipping CI edit."
}

Write-Host "7) Stage and commit the changes" -ForegroundColor Green
git add -A
git commit -m $CommitMsg

Write-Host "8) Run mvnw tests from backend" -ForegroundColor Green
Set-Location "backend"
if (Test-Path "./mvnw") {
    Write-Host "Running: ./mvnw -B -DskipITs=true -DskipTests=false clean test"
    & ./mvnw -B -DskipITs=true -DskipTests=false clean test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Maven tests failed with exit code $LASTEXITCODE" -ForegroundColor Red
        Set-Location ".."
        exit $LASTEXITCODE
    }
} else {
    Write-Host "mvnw not found in backend. Please ensure mvnw is present." -ForegroundColor Red
    Set-Location ".."
    exit 1
}
Set-Location ".."

Write-Host "9) Rebuild Docker images and run smoke test" -ForegroundColor Green
docker builder prune -f
docker compose build --no-cache backend
docker compose up -d backend
Start-Sleep 5
Write-Host "Backend container status:"
docker compose ps backend
Write-Host "Tail backend logs (last 200 lines):"
docker compose logs --no-color --tail=200 backend

Write-Host "10) Push branch to remote" -ForegroundColor Green
git push -u $Remote $FeatureBranch

Write-Host "DONE: Flatten complete. Please open a PR from $FeatureBranch -> develop (or main) and run CI." -ForegroundColor Green
