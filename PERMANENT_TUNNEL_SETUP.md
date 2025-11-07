# Setting Up Permanent Cloudflare Tunnel

## Problem
The current setup uses temporary "quick tunnels" which expire daily and change URLs. This requires updating Zerodha redirect URI every time, which is not practical.

## Solution
Set up a **named tunnel** with Cloudflare that provides a **stable, permanent URL** that doesn't expire.

## Prerequisites
- Cloudflare account (free)
- `cloudflared.exe` downloaded in project root

## Option 1: Named Tunnel with TryCloudflare (Easiest - No Domain Needed)

This uses Cloudflare's trycloudflare.com service but with a named tunnel for stability.

### Steps

1. **Run the setup script:**
   ```powershell
   .\scripts\setup-permanent-tunnel.ps1
   ```

2. **Authenticate with Cloudflare:**
   - Script will open browser for authentication
   - Login with your Cloudflare account (create free account if needed)
   - Return to terminal after login

3. **Tunnel will be created and started:**
   - Script creates a named tunnel: `zerodha-dashboard-tunnel`
   - Starts the tunnel and displays the URL
   - URL should be stable and not expire

4. **Update Zerodha with the new URL:**
   - Copy the tunnel URL shown
   - Update Zerodha redirect URI: `https://[TUNNEL-URL]/api/zerodha/callback`
   - Save and wait 2-3 minutes

5. **Configure tunnel to auto-start (optional):**
   ```powershell
   # Install as Windows service
   .\cloudflared.exe service install
   
   # Start service
   .\cloudflared.exe service start
   ```

## Option 2: Named Tunnel with DuckDNS Domain (RECOMMENDED - Truly Permanent)

**YOU ALREADY HAVE THIS DOMAIN:** `zerodhadashboard.duckdns.org`

This is the **BEST SOLUTION** - gives you a truly permanent URL that never expires or changes!

### Quick Setup (Automated Script)

1. **Run the automated setup script:**
   ```powershell
   .\scripts\setup-permanent-tunnel-duckdns.ps1
   ```

2. **The script will:**
   - Authenticate with Cloudflare (opens browser)
   - Create named tunnel: `zerodha-dashboard-tunnel`
   - Route tunnel to: `zerodhadashboard.duckdns.org`
   - Start tunnel and display permanent URL

3. **Update backend configuration:**
   ```powershell
   .\scripts\update-config-with-permanent-url.ps1
   ```

4. **Update Zerodha ONCE (never need to update again!):**
   - Redirect URI: `https://zerodhadashboard.duckdns.org/api/zerodha/callback`
   - Save and wait 2-3 minutes
   - **This URL is permanent and will never change!**

5. **Set up as Windows service (auto-start on boot):**
   ```powershell
   .\cloudflared.exe service install
   .\cloudflared.exe service start
   ```

### Manual Setup (If needed)

If the automated script doesn't work, follow these manual steps:

1. **Add DuckDNS domain to Cloudflare:**
   - Login to Cloudflare dashboard: https://dash.cloudflare.com
   - Click "Add a Site"
   - Enter: `zerodhadashboard.duckdns.org`
   - Choose Free plan
   - Update nameservers in DuckDNS dashboard (as shown by Cloudflare)

2. **Create named tunnel:**
   ```powershell
   .\cloudflared.exe tunnel login
   .\cloudflared.exe tunnel create zerodha-dashboard-tunnel
   ```

3. **Route tunnel to domain:**
   ```powershell
   .\cloudflared.exe tunnel route dns zerodha-dashboard-tunnel zerodhadashboard.duckdns.org
   ```

4. **Create config file:**
   Create: `%USERPROFILE%\.cloudflared\config.yml`
   ```yaml
   tunnel: <TUNNEL-ID>
   credentials-file: C:\Users\<USER>\.cloudflared\<TUNNEL-ID>.json

   ingress:
     - hostname: zerodhadashboard.duckdns.org
       service: http://localhost:9000
     - service: http_status:404
   ```

5. **Run tunnel:**
   ```powershell
   .\cloudflared.exe tunnel --config "%USERPROFILE%\.cloudflared\config.yml" run zerodha-dashboard-tunnel
   ```

## Option 3: Cloudflare Tunnel Service (Recommended for Production)

Run tunnel as a Windows service that auto-starts on boot.

### Steps

1. **Install tunnel service:**
   ```powershell
   .\cloudflared.exe service install
   ```

2. **Start service:**
   ```powershell
   .\cloudflared.exe service start
   ```

3. **Check service status:**
   ```powershell
   Get-Service cloudflared
   ```

4. **View service logs:**
   ```powershell
   Get-EventLog -LogName Application -Source cloudflared -Newest 20
   ```

## Updating Configuration Scripts

After setting up permanent tunnel, update the automation script to use the named tunnel instead of quick tunnels.

### Update `scripts/auto-update-tunnel.ps1`:

Replace quick tunnel creation with:
```powershell
# Use named tunnel instead of quick tunnel
$configFile = "$env:USERPROFILE\.cloudflared\config.yml"
$tunnelName = "zerodha-dashboard-tunnel"

# Get tunnel URL from running tunnel
$tunnelProcess = Start-Process -FilePath ".\cloudflared.exe" `
    -ArgumentList "tunnel", "--config", $configFile, "run", $tunnelName `
    -NoNewWindow -PassThru
```

## Verifying Tunnel Stability

1. **Check tunnel is running:**
   ```powershell
   Get-Process cloudflared
   ```

2. **Test tunnel URL:**
   ```powershell
   Invoke-WebRequest https://[TUNNEL-URL]/api/zerodha/status
   ```

3. **Monitor tunnel logs:**
   - Check Windows Event Viewer for service logs
   - Or check console output if running manually

## Troubleshooting

### Tunnel URL Changes
- **Quick tunnels** (default) expire daily
- **Named tunnels** should remain stable
- If URL changes, verify you're using named tunnel, not quick tunnel

### Service Not Starting
```powershell
# Check service status
Get-Service cloudflared

# View service configuration
Get-Content "C:\Program Files\cloudflared\config.yml"

# Restart service
Restart-Service cloudflared
```

### Authentication Issues
```powershell
# Re-authenticate
.\cloudflared.exe tunnel login
```

### Config File Issues
- Config file location: `%USERPROFILE%\.cloudflared\config.yml`
- Check tunnel ID matches in config
- Verify credentials file exists

## Benefits of Permanent Tunnel

✅ **Stable URL** - Doesn't change daily  
✅ **No manual updates** - Set once in Zerodha  
✅ **Auto-start** - Runs as Windows service  
✅ **Reliable** - Named tunnels are more stable  
✅ **Production-ready** - Suitable for client deployments  

## Next Steps

1. Run setup script: `.\scripts\setup-permanent-tunnel.ps1`
2. Note the tunnel URL provided
3. Update Zerodha redirect URI with the new URL
4. Set up as Windows service for auto-start
5. Update automation scripts to use named tunnel

## References

- Cloudflare Tunnel Docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- Cloudflared GitHub: https://github.com/cloudflare/cloudflared
- Named Tunnels Guide: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/

