#!/bin/bash

# Test NSE Integration Script
# This script tests the real NSE data integration

echo "🚀 Testing NSE Integration..."

# Test real derivatives endpoint
echo ""
echo "📊 Testing Real Derivatives Endpoint..."
if curl -s "http://localhost:8080/api/real-derivatives?underlying=NIFTY" > /dev/null; then
    echo "✅ Real derivatives endpoint working!"
    response=$(curl -s "http://localhost:8080/api/real-derivatives?underlying=NIFTY")
    echo "   - Response received: $(echo $response | jq -r '.underlying // "N/A"')"
    echo "   - Spot Price: ₹$(echo $response | jq -r '.spotPrice // "N/A"')"
    echo "   - Data Source: $(echo $response | jq -r '.dataSource // "N/A"')"
    echo "   - Futures Count: $(echo $response | jq -r '.futures | length // 0')"
    echo "   - Call Options Count: $(echo $response | jq -r '.callOptions | length // 0')"
    echo "   - Put Options Count: $(echo $response | jq -r '.putOptions | length // 0')"
else
    echo "❌ Real derivatives endpoint failed"
fi

# Test real derivatives by segment
echo ""
echo "📈 Testing Real Derivatives by Segment..."

echo "Testing FUTURES segment..."
if curl -s "http://localhost:8080/api/real-derivatives/segment?segment=FUTURES&underlying=NIFTY" > /dev/null; then
    count=$(curl -s "http://localhost:8080/api/real-derivatives/segment?segment=FUTURES&underlying=NIFTY" | jq -r 'length // 0')
    echo "✅ Futures segment working! Count: $count"
else
    echo "❌ Futures segment failed"
fi

echo "Testing CALL_OPTIONS segment..."
if curl -s "http://localhost:8080/api/real-derivatives/segment?segment=CALL_OPTIONS&underlying=NIFTY" > /dev/null; then
    count=$(curl -s "http://localhost:8080/api/real-derivatives/segment?segment=CALL_OPTIONS&underlying=NIFTY" | jq -r 'length // 0')
    echo "✅ Call options segment working! Count: $count"
else
    echo "❌ Call options segment failed"
fi

echo "Testing PUT_OPTIONS segment..."
if curl -s "http://localhost:8080/api/real-derivatives/segment?segment=PUT_OPTIONS&underlying=NIFTY" > /dev/null; then
    count=$(curl -s "http://localhost:8080/api/real-derivatives/segment?segment=PUT_OPTIONS&underlying=NIFTY" | jq -r 'length // 0')
    echo "✅ Put options segment working! Count: $count"
else
    echo "❌ Put options segment failed"
fi

# Test real strike monitoring
echo ""
echo "🎯 Testing Real Strike Price Monitoring..."
if curl -s "http://localhost:8080/api/real-strike-monitoring?underlying=NIFTY" > /dev/null; then
    echo "✅ Real strike monitoring working!"
    response=$(curl -s "http://localhost:8080/api/real-strike-monitoring?underlying=NIFTY")
    echo "   - Spot Price: ₹$(echo $response | jq -r '.spotPrice // "N/A"')"
    echo "   - Daily Strike: ₹$(echo $response | jq -r '.dailyStrikePrice // "N/A"')"
    echo "   - Call Options Count: $(echo $response | jq -r '.callOptions | length // 0')"
    echo "   - Put Options Count: $(echo $response | jq -r '.putOptions | length // 0')"
else
    echo "❌ Real strike monitoring failed"
fi

echo ""
echo "🎉 NSE Integration Test Complete!"
echo "If all tests pass, your dashboard is now using real NSE data!"

