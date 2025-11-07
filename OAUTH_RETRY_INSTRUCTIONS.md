# OAuth Retry Instructions

## Issue
The "Invalid checksum" error was caused by an **expired request_token**. Request tokens from Zerodha expire within 30-60 seconds.

## Solution
Retry the OAuth flow with a fresh token.

## Steps

### 1. Get Fresh OAuth URL
```powershell
Invoke-WebRequest http://localhost:9000/api/zerodha/auth-url
```

Copy the `auth_url` from the response.

### 2. Complete Login Immediately
1. Open the OAuth URL in your browser **immediately**
2. Login with your Zerodha credentials
3. Complete the login process quickly (within 30-60 seconds)

### 3. Verify Callback URL
After login, Zerodha will redirect to:
```
https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback?request_token=xxx&action=login&status=success
```

**Important:** Make sure the URL includes `/api/zerodha/callback` in the path!

### 4. Check Response
The callback should return:
```json
{
  "success": true,
  "access_token": "your-access-token",
  "message": "OAuth authentication successful"
}
```

## Configuration Verified
- ✅ API Key: `hvgaaodyzyhzq57s`
- ✅ API Secret: `r6t8jx91k6xb1vrckgwrqi4owjd2u314` (matches Zerodha)
- ✅ Redirect URI: `https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback`
- ✅ Backend running on port 9000
- ✅ Tunnel is active

## Troubleshooting

### Still Getting "Invalid checksum"
- Make sure you complete the login quickly (token expires fast)
- Verify API secret matches exactly (no extra spaces)
- Check backend logs for detailed error messages

### 404 Error
- Make sure the callback URL includes `/api/zerodha/callback`
- Verify the tunnel is still running
- Check backend is running on port 9000

### Token Expired
- Request tokens expire in 30-60 seconds
- Get a fresh OAuth URL and retry immediately
- Complete the login as soon as you open the URL

## Next Steps After Success
Once you get the access_token:
1. Store it securely
2. Use it for API calls to Zerodha Kite API
3. The token may need to be refreshed periodically

