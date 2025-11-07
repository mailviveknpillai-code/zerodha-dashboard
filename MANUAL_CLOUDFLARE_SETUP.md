# Manual Cloudflare Tunnel Setup - Step by Step

## Issue: Certificate Not Created

The Cloudflare login may not have completed properly. Follow these steps manually:

## Step 1: Complete Cloudflare Login

Run this command and **wait for the browser to open and complete authentication**:

```powershell
.\cloudflared.exe tunnel login
```

**Important:**
- A browser window will open
- Complete the login in the browser
- Wait for the message: "You have successfully logged in"
- The certificate file (`cert.pem`) should be created at: `C:\Users\vivek\.cloudflared\cert.pem`

**Verify login completed:**
```powershell
Test-Path "$env:USERPROFILE\.cloudflared\cert.pem"
```
Should return `True`

## Step 2: Create Tunnel

```powershell
.\cloudflared.exe tunnel create zerodha-dashboard
```

Expected output:
```
Tunnel zerodha-dashboard created with ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Step 3: Get Tunnel ID

```powershell
.\cloudflared.exe tunnel list
```

Look for the output like:
```
zerodha-dashboard  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Copy the tunnel ID** (the long hex string).

## Step 4: Create Config File

Create file: `C:\Users\vivek\.cloudflared\config.yml`

Replace `<TUNNEL_ID>` with your actual tunnel ID:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\vivek\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: zerodhadashboard.duckdns.org
    service: http://localhost:9000
  - service: http_status:404
```

## Step 5: Route DNS

Replace `<TUNNEL_ID>` with your tunnel ID:

```powershell
.\cloudflared.exe tunnel route dns <TUNNEL_ID> zerodhadashboard.duckdns.org
```

## Step 6: Start Tunnel

Replace `<TUNNEL_ID>` with your tunnel ID:

```powershell
.\cloudflared.exe tunnel run <TUNNEL_ID>
```

Or run in background:
```powershell
Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel","run","<TUNNEL_ID>"
```

## Step 7: Verify

### Test Local Backend:
```powershell
Invoke-WebRequest http://localhost:9000/api/zerodha/status
```

### Test Public URL (wait 2-3 minutes for DNS):
```powershell
Invoke-WebRequest https://zerodhadashboard.duckdns.org/api/zerodha/status
```

## Troubleshooting

### Certificate Still Not Found
- Make sure you completed the login in the browser
- Check if certificate is in a different location
- Try logging out and back in: `.\cloudflared.exe tunnel logout` then login again

### Tunnel Creation Fails
- Ensure certificate file exists first
- Check Cloudflare account has access to tunnels
- Try creating tunnel from Cloudflare dashboard

### DNS Not Working
- Wait 2-5 minutes for DNS propagation
- Check Cloudflare dashboard for DNS records
- Verify tunnel is running: `Get-Process -Name cloudflared`

## Quick Commands Reference

```powershell
# Login
.\cloudflared.exe tunnel login

# Create tunnel
.\cloudflared.exe tunnel create zerodha-dashboard

# List tunnels (get ID)
.\cloudflared.exe tunnel list

# Create config (manual step - see above)

# Route DNS
.\cloudflared.exe tunnel route dns <TUNNEL_ID> zerodhadashboard.duckdns.org

# Run tunnel
.\cloudflared.exe tunnel run <TUNNEL_ID>
```

