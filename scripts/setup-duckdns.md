# DuckDNS Setup Guide for Breeze API Redirect URI

## Step 1: Create DuckDNS Account

1. Go to https://www.duckdns.org/
2. Click "Sign in with GitHub" or "Sign in with Google"
3. Sign in with your preferred account

## Step 2: Create Your Domain

1. After logging in, you'll see your dashboard
2. In the "Domain" field, enter your desired subdomain name (e.g., `zerodhadashboard`)
3. Click "Add domain"
4. Your domain will be: `zerodhadashboard.duckdns.org`
5. Copy your **Token** from the dashboard

## Step 3: Update DuckDNS with Your Public IP

### Option A: Manual Update (One-time for testing)

1. Go to: `https://www.duckdns.org/update?domains=YOUR_DOMAIN&token=YOUR_TOKEN&ip=`
2. Replace:
   - `YOUR_DOMAIN` with your subdomain (e.g., `zerodhadashboard`)
   - `YOUR_TOKEN` with your DuckDNS token
3. In browser, it will show "OK" if successful

### Option B: Automated Update (Recommended)

#### For Windows:

1. Edit `scripts/update-duckdns.ps1`
2. Replace `$Token` and `$Domain` with your values
3. Run the script:
   ```powershell
   .\scripts\update-duckdns.ps1 -Token "YOUR_TOKEN" -Domain "zerodhadashboard"
   ```

#### For Linux/Mac:

1. Edit `scripts/update-duckdns.sh`
2. Replace `DOMAIN` and `TOKEN` variables
3. Make it executable and run:
   ```bash
   chmod +x scripts/update-duckdns.sh
   ./scripts/update-duckdns.sh
   ```

### Option C: Add to Windows Task Scheduler (Auto-update)

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 2:00 AM (or any time)
4. Action: Start a program
5. Program: `powershell.exe`
6. Arguments: `-File "C:\path\to\your\project\scripts\update-duckdns.ps1" -Token "YOUR_TOKEN" -Domain "YOUR_DOMAIN"`
7. Save and run

## Step 4: Configure Breeze API Redirect URI

1. Log into ICICI Direct Breeze API dashboard
2. Find your registered app
3. Update the redirect/callback URL to:
   ```
   http://zerodhadashboard.duckdns.org:8080/api/breeze/callback
   ```
   Or with HTTPS (if you set up SSL):
   ```
   https://zerodhadashboard.duckdns.org/api/breeze/callback
   ```
4. Save the changes

## Step 5: Configure Port Forwarding in Your Router

Your router needs to forward external port 8080 to your internal server:

1. Access your router's admin panel (usually 192.168.1.1 or 192.168.0.1)
2. Go to "Port Forwarding" or "Virtual Server" settings
3. Add a new rule:
   - External Port: 8080
   - Internal IP: Your server's local IP (e.g., 192.168.x.x)
   - Internal Port: 8080
   - Protocol: TCP
4. Save and apply

## Step 6: Test the Setup

1. Run the DuckDNS updater script
2. Test your callback URL:
   ```powershell
   curl "http://zerodhadashboard.duckdns.org:8080/api/breeze/callback?apisession=test123"
   ```
3. Check if the backend logs show the request received

## Troubleshooting

### Issue: DuckDNS shows "KO" response
- Check that your IP is not behind a NAT
- Ensure the token is correct
- Try accessing the update URL directly in browser

### Issue: Can't access the callback URL from outside
- Check firewall settings (allow port 8080)
- Verify port forwarding is configured correctly
- Test with `curl` or `telnet` from external network

### Issue: Domain not resolving to correct IP
- Verify DuckDNS update was successful (shows "OK")
- Use `nslookup zerodhadashboard.duckdns.org` to check DNS
- Clear your DNS cache: `ipconfig /flushdns` (Windows)

## Next Steps

Once DuckDNS is working:
1. ✅ Your domain: `zerodhadashboard.duckdns.org`
2. ✅ Update Breeze API redirect URI
3. ✅ Test authentication flow
4. ✅ Switch from mock data to real Breeze API data


