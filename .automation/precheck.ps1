$files = @(
  "backend/dashboard/src/main/java/com/zerodha/dashboard/model/TickSnapshot.java",
  "backend/dashboard/src/test/java/com/zerodha/dashboard/model/TickSnapshotTest.java"
)

foreach ($file in $files) {
  $fullPath = Join-Path (Resolve-Path .) $file
  if (-not (Test-Path $fullPath)) {
    Write-Error "Required file missing: $fullPath"
    exit 1
  }
}

Write-Host "All required Java files found!"
exit 0