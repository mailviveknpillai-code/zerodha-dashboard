#!/usr/bin/env bash
set -e
SYMBOL="${1:-NSEI}"
KEY="${ALPHA_VANTAGE_API_KEY:-RUD59ZNA5UWUZH3M}"
BACKEND="http://localhost:8080/api/alpha-demo?symbol=$SYMBOL"
ALPHA="https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=$SYMBOL&apikey=$KEY"

echo "== Backend output =="
b=$(curl -s "$BACKEND" | jq .)
echo "$b"

echo "== Alpha Vantage raw =="
a=$(curl -s "$ALPHA" | jq .)
echo "$a"

bprice=$(echo "$b" | jq -r '.lastPrice // .["Global Quote"]["05. price"] // empty')
aprice=$(echo "$a" | jq -r '."Global Quote"."05. price" // empty')

echo ""
echo "Backend price : $bprice"
echo "Alpha price   : $aprice"

if [ -n "$bprice" ] && [ -n "$aprice" ]; then
    diff=$(python - <<PY
b=float("$bprice"); a=float("$aprice")
print(abs(b-a))
PY
)
    echo "Δ = $diff"
    if (( $(echo "$diff < 0.5" | bc -l) )); then
        echo "✅ MATCH: within 0.5 difference"
    else
        echo "⚠️ MISMATCH: backend/alpha differ significantly"
    fi
else
    echo "❌ Missing price value from one source"
fi
