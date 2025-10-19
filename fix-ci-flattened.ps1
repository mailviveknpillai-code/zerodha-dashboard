#!/usr/bin/env pwsh
# PowerShell version of the CI fix script adapted for flattened backend structure

param(
    [string]$WorkingModulePath = "backend",
    [string]$CiWorkflowPath = ".github/workflows/ci.yml",
    [string]$CommitMsg = "ci: fix mvnw permission, use module working-dir and fallback to system mvn",
    [string]$GitPushRemote = "origin"
)

# Get current branch
$CurrentBranch = git rev-parse --abbrev-ref HEAD
if ($LASTEXITCODE -ne 0) {
    $CurrentBranch = "master"
}

# Helper logging functions
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Blue }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Fail { Write-Host "[ERROR] $args" -ForegroundColor Red; exit 1 }

Write-Info "Working with flattened backend structure at: $WorkingModulePath"

# 1) Make mvnw executable when present and record chmod in git index.
if (Test-Path "$WorkingModulePath/mvnw") {
    Write-Info "Found mvnw at $WorkingModulePath/mvnw — setting executable bit"
    & chmod +x "$WorkingModulePath/mvnw"
    git update-index --add --chmod=+x "$WorkingModulePath/mvnw"
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "git update-index failed (ok on detached/readonly worktrees)"
    }
} else {
    Write-Warn "No mvnw found at $WorkingModulePath/mvnw — CI will fall back to system 'mvn'"
}

# Also handle top-level mvnw if project uses it
if (Test-Path "mvnw") {
    Write-Info "Found top-level mvnw — setting executable bit"
    & chmod +x "mvnw"
    git update-index --add --chmod=+x "mvnw"
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "git update-index failed for top-level mvnw"
    }
}

# 2) Create / update GitHub Actions workflow that:
#    - uses JDK 21
#    - runs from backend (flattened structure)
#    - uses mvnw when available, falls back to mvn
#    - disables testcontainers for CI runs (so Docker/socket not required)
Write-Info "Writing CI workflow to $CiWorkflowPath"
$workflowDir = Split-Path $CiWorkflowPath -Parent
if (!(Test-Path $workflowDir)) {
    New-Item -ItemType Directory -Path $workflowDir -Force
}

$workflowContent = @"
name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7.2.5-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: Verify mvn wrapper or system mvn
        run: |
          if [ -f "./backend/mvnw" ]; then
            chmod +x ./backend/mvnw || true
            echo "Using project mvnw wrapper"
            ./backend/mvnw -v
          elif [ -f "./mvnw" ]; then
            chmod +x ./mvnw || true
            echo "Using top-level mvnw wrapper"
            ./mvnw -v
          else
            echo "No mvnw wrapper found — will use system 'mvn'"
            mvn -v
          fi

      - name: Build and Test Backend (flattened structure)
        working-directory: backend
        env:
          TESTCONTAINERS_DISABLED: "true"
          SPRING_TESTCONTAINERS_ENABLED: "false"
          REDIS_HOST: "redis"
          REDIS_PORT: "6379"
        run: |
          if [ -f "./mvnw" ]; then
            ./mvnw -B clean test
          elif [ -f "../mvnw" ]; then
            ../mvnw -B clean test
          else
            mvn -B clean test
          fi
"@

Set-Content -Path $CiWorkflowPath -Value $workflowContent

# 3) Stage changes and commit
Write-Info "Staging changes for commit"
git add $CiWorkflowPath
if ($LASTEXITCODE -ne 0) {
    Write-Warn "git add failed for workflow (files may be untracked)"
}

# add executable mvnw if present
if (Test-Path "$WorkingModulePath/mvnw") {
    git add "$WorkingModulePath/mvnw"
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "git add of mvnw failed"
    }
}
if (Test-Path "mvnw") {
    git add "mvnw"
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "git add top-level mvnw failed"
    }
}

# If there are no changes to commit, skip commit/push
$stagedChanges = git diff --cached --name-only
if ($stagedChanges.Count -eq 0) {
    Write-Info "No changes to commit (workflow and mvnw already up-to-date)"
} else {
    Write-Info "Committing changes"
    git commit -m $CommitMsg
    Write-Info "Pushing to $GitPushRemote/$CurrentBranch"
    git push $GitPushRemote $CurrentBranch
}

# 4) Run tests locally for quick verification (backend module).
Write-Info "Running local tests for module: $WorkingModulePath"
if (Get-Command mvn -ErrorAction SilentlyContinue) {
    Push-Location $WorkingModulePath
    try {
        Write-Info "Running: mvn -B -DskipITs=true test"
        mvn -B -DskipITs=true test 2>&1 | Tee-Object -FilePath "../mvn-local-backend-test.log"
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Local tests failed (see mvn-local-backend-test.log)"
            Pop-Location
            exit 1
        }
        Write-Info "Local tests finished. Tail of the log:"
        Get-Content "../mvn-local-backend-test.log" -Tail 40
    } finally {
        Pop-Location
    }
} else {
    Write-Warn "Maven not installed locally. Skipping local test run. CI will run tests on GitHub Actions."
}

Write-Info "All done — workflow updated and pushed. If CI still fails, open Actions -> check logs for permission denied or mvn fallback output."
