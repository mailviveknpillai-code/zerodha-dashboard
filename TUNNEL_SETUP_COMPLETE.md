# ✅ Cloudflare Tunnel Setup Complete!

## Tunnel Information

**Public URL:** `https://aka-steps-blah-speakers.trycloudflare.com`

**Callback URL:** `https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback`

**Local Service:** `http://localhost:9000`

## Configuration Updated

✅ Updated `application.properties` with the new redirect URI

## Next Steps

### 1. Update Zerodha App Settings

1. Go to: https://kite.zerodha.com/connect/apps
2. Find your app (API Key: `hvgaaodyzyhzq57s`)
3. Edit the app
4. Update the **Redirect URI** to:
   ```
   https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback
   ```
5. Save the changes

**⚠️ IMPORTANT:** This URI cannot be changed once set in Zerodha!

### 2. Restart Backend (if needed)

The backend should auto-reload, but if not:
```powershell
# Stop current backend (Ctrl+C)
# Then restart:
cd backend\dashboard
mvn spring-boot:run
```

### 3. Test OAuth Flow

1. Get OAuth URL:
   ```powershell
   Invoke-WebRequest http://localhost:9000/api/zerodha/auth-url
   ```

2. Copy the `auth_url` from the response

3. Visit the URL in browser and login with Zerodha credentials

4. After login, Zerodha will redirect to:
   `https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback?request_token=xxx&action=login&status=success`

5. The callback will exchange the token and return access_token

## Keep Tunnel Running

**⚠️ IMPORTANT:** The Cloudflare Tunnel process must stay running!

- The tunnel is currently running in the terminal
- Don't close that terminal window
- To stop: Press `Ctrl+C` in the tunnel terminal
- To restart: Run `.\cloudflared.exe tunnel --url http://localhost:9000` again

## Test URLs

- **Local Backend:** http://localhost:9000/api/zerodha/status
- **Public URL:** https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/status
- **OAuth Auth URL:** http://localhost:9000/api/zerodha/auth-url

## Troubleshooting

### Tunnel URL Not Accessible
- Wait 1-2 minutes for DNS propagation
- Check tunnel is still running
- Verify backend is running on port 9000

### OAuth Callback Fails
- Verify Zerodha app redirect URI is updated
- Check tunnel is running
- Check backend logs for errors

### Need to Update Redirect URI
If you need to change the redirect URI:
1. Get a new tunnel URL (run tunnel command again)
2. Update Zerodha app settings
3. Update `application.properties`

## Quick Tunnel Notes

- This is a **quick tunnel** (temporary)
- URL changes each time you restart the tunnel
- For permanent URL, set up a named tunnel later
- Perfect for development and testing!

---

**Status:** ✅ Tunnel is running and ready for OAuth!

