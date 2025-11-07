# Fixing "Invalid checksum" Error - Final Steps

## Error
```
{"error": "Invalid `checksum`.", "message": "Failed to exchange request token for access token"}
```

## Root Cause
The API secret in your configuration does **NOT match** the API secret in your Zerodha app settings.

## Solution

### Step 1: Verify API Secret in Zerodha

1. Go to: **https://kite.zerodha.com/connect/apps**
2. Find your app with API Key: `hvgaaodyzyhzq57s`
3. Click on the app to view details
4. **Copy the API Secret EXACTLY** (select all, copy)
5. **Compare it with:** `r6t8jx91k6xb1vrckgwrqi4owjd2u314`

### Step 2: Check for Common Issues

- ✅ **No spaces** before or after the secret
- ✅ **All characters** match exactly (32 characters)
- ✅ **Case-sensitive** (should be all lowercase)
- ✅ **No hidden characters** (copy directly, don't type)

### Step 3: Update Configuration

If the secret is different, share it and I'll update:
- `application.properties`
- `docker-compose.yml`
- Restart the backend

## Checksum Calculation

The checksum is calculated correctly as:
```
SHA256(api_key + request_token + api_secret)
```

Our code is doing this correctly. The only issue is the API secret value.

## Current Configuration

- **API Key:** `hvgaaodyzyhzq57s` ✅
- **API Secret (in config):** `r6t8jx91k6xb1vrckgwrqi4owjd2u314` ❓
- **Checksum calculation:** ✅ Correct

## Next Steps

1. **Verify the API secret in Zerodha dashboard**
2. **If different, share the correct secret**
3. **I'll update the configuration**
4. **Retry OAuth flow**

The checksum calculation is correct - we just need the right API secret!

