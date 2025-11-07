# Complete Cloudflare Tunnel Setup Guide

## Prerequisites
- Cloudflare account (free) - Sign up at https://dash.cloudflare.com/sign-up
- Backend running on port 9000
- DuckDNS domain: `zerodhadashboard.duckdns.org`

## Step-by-Step Setup

### Step 1: Login to Cloudflare
```powershell
.\cloudflared.exe tunnel login
```
- This will open a browser window
- Login with your Cloudflare account
- Authorize the application

### Step 2: Create Named Tunnel
```powershell
.\cloudflared.exe tunnel create zerodha-dashboard
```
- This creates a permanent tunnel named "zerodha-dashboard"
- Note the tunnel ID that's displayed (you'll need it)

### Step 3: Get Tunnel ID
```powershell
.\cloudflared.exe tunnel list
```
- Find the tunnel ID for "zerodha-dashboard"
- Copy the tunnel ID (it's a long hex string)

### Step 4: Create Configuration File
Create file: `C:\Users\vivek\.cloudflared\config.yml`

Replace `<tunnel-id>` with your actual tunnel ID:

```yaml
tunnel: <tunnel-id>
credentials-file: C:\Users\vivek\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: zerodhadashboard.duckdns.org
    service: http://localhost:9000
  - service: http_status:404
```

### Step 5: Route DNS
```powershell
.\cloudflared.exe tunnel route dns <tunnel-id> zerodhadashboard.duckdns.org
```
- This configures DNS routing through Cloudflare
- May take a few minutes to propagate

### Step 6: Start Tunnel
```powershell
.\cloudflared.exe tunnel run <tunnel-id>
```

Or run in background:
```powershell
Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel","run","<tunnel-id>"
```

### Step 7: Verify
Test the public URL:
```powershell
Invoke-WebRequest https://zerodhadashboard.duckdns.org/api/zerodha/status
```

Should return your backend status.

## Alternative: Use Interactive Script
Run the interactive script:
```powershell
.\scripts\setup-cloudflare-manual.ps1
```

## Troubleshooting

### "Tunnel not found"
- Make sure you created the tunnel in Step 2
- Check tunnel list: `.\cloudflared.exe tunnel list`

### "DNS not resolving"
- Wait a few minutes for DNS propagation
- Check Cloudflare dashboard for DNS records
- Verify DuckDNS is pointing to Cloudflare

### "Connection refused"
- Ensure backend is running on port 9000
- Check tunnel is running: `Get-Process -Name cloudflared`
- Verify config file has correct port

### "Tunnel keeps stopping"
- Run as Windows service (see below)
- Or use a process manager to auto-restart

## Running as Windows Service (Optional)

To run tunnel automatically on Windows startup:

1. Install as service:
   ```powershell
   .\cloudflared.exe service install
   ```

2. Start service:
   ```powershell
   Start-Service cloudflared
   ```

## Next Steps

After tunnel is running:
1. Test OAuth flow from Zerodha
2. Verify callback URL is accessible
3. Complete authentication
4. Test API calls

