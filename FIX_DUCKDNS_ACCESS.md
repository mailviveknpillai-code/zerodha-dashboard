# Fix DuckDNS Domain Access for Zerodha OAuth Callback

## Problem
Your DuckDNS domain `https://zerodhadashboard.duckdns.org` is not publicly accessible, causing `ERR_CONNECTION_REFUSED` when Zerodha tries to redirect to your callback URL.

## Root Cause
The temporary Cloudflare Tunnel doesn't route to your custom DuckDNS domain. You need a **permanent Cloudflare Tunnel** configured to route `zerodhadashboard.duckdns.org` → `localhost:9000`.

## Solution: Set Up Permanent Cloudflare Tunnel

### Step 1: Create Cloudflare Account (Free)
1. Go to: https://dash.cloudflare.com/sign-up
2. Sign up for a free account

### Step 2: Login to Cloudflare
```powershell
.\cloudflared.exe tunnel login
```
This will open a browser window to authorize.

### Step 3: Create Named Tunnel
```powershell
.\cloudflared.exe tunnel create zerodha-dashboard
```
This creates a tunnel named "zerodha-dashboard" and saves credentials.

### Step 4: Create Configuration File
Create file: `$env:USERPROFILE\.cloudflared\config.yml`

```yaml
tunnel: zerodha-dashboard
credentials-file: C:\Users\vivek\.cloudflared\[tunnel-id].json

ingress:
  - hostname: zerodhadashboard.duckdns.org
    service: http://localhost:9000
  - service: http_status:404
```

**Note**: Replace `[tunnel-id]` with the actual tunnel ID from Step 3.

### Step 5: Configure DNS (Important!)
Since you're using DuckDNS, you need to point it to Cloudflare:

1. **Option A: Use Cloudflare DNS** (Recommended)
   ```powershell
   .\cloudflared.exe tunnel route dns zerodha-dashboard zerodhadashboard.duckdns.org
   ```
   This will configure DNS through Cloudflare.

2. **Option B: Update DuckDNS** (Alternative)
   - DuckDNS points to an IP, but Cloudflare Tunnel needs a CNAME
   - You may need to configure a CNAME record in DuckDNS if supported
   - Or use Cloudflare's DNS instead

### Step 6: Run the Tunnel
```powershell
.\cloudflared.exe tunnel run zerodha-dashboard
```

### Step 7: Verify
1. Test: `https://zerodhadashboard.duckdns.org/api/zerodha/status`
2. Should return your backend status

## Alternative: Quick Test Without Permanent Setup

If you want to test immediately without setting up permanent tunnel:

1. **Use the temporary tunnel URL** (from the Cloudflare Tunnel window)
2. **But wait** - Zerodha redirect URI is already set and can't be changed!
3. **Solution**: You'll need to complete the permanent tunnel setup

## Troubleshooting

### "Invalid checksum" Error
If you see this when testing locally, it might be because:
- Request token has expired (they expire quickly)
- Checksum calculation issue (less likely)
- API secret mismatch

### Tunnel Not Starting
- Check if tunnel credentials file exists
- Verify config.yml syntax
- Check if port 9000 is accessible locally

### DNS Not Resolving
- Wait a few minutes for DNS propagation
- Check Cloudflare dashboard for DNS records
- Verify DuckDNS settings

## Next Steps

1. Set up permanent Cloudflare Tunnel (above)
2. Test callback URL: `https://zerodhadashboard.duckdns.org/api/zerodha/status`
3. Retry OAuth flow from Zerodha
4. Verify token exchange works

## Important Notes

- The request_token from Zerodha expires quickly - you may need to retry OAuth flow
- Once permanent tunnel is set up, it will persist across restarts
- Keep the tunnel running when using the application
- Consider setting up tunnel as a Windows service for auto-start

