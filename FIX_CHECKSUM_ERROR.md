# Fixing "Invalid checksum" Error

## Error
```
{"error":"Invalid `checksum`.","message":"Failed to exchange request token for access token"}
```

## Cause
The API secret in `application.properties` doesn't match the API secret configured in your Zerodha app.

## Solution

### Step 1: Verify API Secret in Zerodha
1. Go to: https://kite.zerodha.com/connect/apps
2. Find your app (API Key: `hvgaaodyzyhzq57s`)
3. Check the **API Secret** value
4. Copy it exactly (including all characters)

### Step 2: Update application.properties
If the secret is different, update it:

```properties
zerodha.apisecret=${ZERODHA_API_SECRET:YOUR_ACTUAL_SECRET_HERE}
```

Replace `YOUR_ACTUAL_SECRET_HERE` with the actual secret from Zerodha.

### Step 3: Restart Backend
After updating, restart the backend to pick up the new secret.

### Step 4: Retry OAuth Flow
1. Get a fresh OAuth URL: `http://localhost:9000/api/zerodha/auth-url`
2. Complete the login again
3. The callback should now work

## Current Configuration
- **API Key:** `hvgaaodyzyhzq57s`
- **API Secret (in config):** `r6t8jx91k6xb1vrckgwrqi4owjd2u314`

**Verify this secret matches exactly what's in Zerodha!**

## Checksum Calculation
The checksum is calculated as:
```
SHA256(api_key + request_token + api_secret)
```

If the API secret is wrong, the checksum will be wrong, and Zerodha will reject it.

## Common Issues
1. **Extra spaces** - Make sure there are no spaces in the secret
2. **Case sensitivity** - The secret is case-sensitive
3. **Special characters** - Make sure all special characters are included
4. **Copy/paste errors** - Double-check the entire secret was copied

