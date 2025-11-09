param(
    [string]$Symbol = "NSEI",
    [string]$Key = "RUD59ZNA5UWUZH3M"
)

$Backend = "http://localhost:8080/api/alpha-demo?symbol=$Symbol"
$Alpha = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=$Symbol&apikey=$Key"

Write-Host "== Backend output ==" -ForegroundColor Green
try {
    $b = Invoke-RestMethod -Uri $Backend -UseBasicParsing
    $b | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Backend error: $($_.Exception.Message)" -ForegroundColor Red
    $b = $null
}

Write-Host "`n== Alpha Vantage raw ==" -ForegroundColor Green
try {
    $a = Invoke-RestMethod -Uri $Alpha -UseBasicParsing
    $a | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Alpha Vantage error: $($_.Exception.Message)" -ForegroundColor Red
    $a = $null
}

if ($b -and $a) {
    $bprice = $b.lastPrice
    $aprice = $a."Global Quote"."05. price"
    
    Write-Host "`nBackend price : $bprice" -ForegroundColor Yellow
    Write-Host "Alpha price   : $aprice" -ForegroundColor Yellow
    
    if ($bprice -and $aprice) {
        $diff = [Math]::Abs([double]$bprice - [double]$aprice)
        Write-Host "Delta = $diff" -ForegroundColor Cyan
        
        if ($diff -lt 0.5) {
            Write-Host "MATCH: within 0.5 difference" -ForegroundColor Green
        } else {
            Write-Host "MISMATCH: backend/alpha differ significantly" -ForegroundColor Red
        }
    } else {
        Write-Host "Missing price value from one source" -ForegroundColor Red
    }
} else {
    Write-Host "Could not fetch data from one or both sources" -ForegroundColor Red
}