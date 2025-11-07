# Step-by-Step Commands to Rebuild and Test

## Step 1: Stop the Backend Container
```bash
docker-compose stop backend
```

## Step 2: Rebuild Backend Image (Without Cache)
```bash
docker-compose build --no-cache backend
```
**Note:** This will take 2-5 minutes as it rebuilds everything from scratch.

## Step 3: Start the Backend
```bash
docker-compose up -d backend
```

## Step 4: Wait for Backend to Start (30 seconds)
```bash
timeout /t 30
```
Or on Linux/Mac:
```bash
sleep 30
```

## Step 5: Check Backend Status
```bash
docker-compose ps backend
```

## Step 6: Check Zerodha Configuration
```bash
curl http://localhost:9000/api/zerodha/status
```
Or on Windows PowerShell:
```powershell
Invoke-WebRequest http://localhost:9000/api/zerodha/status | Select-Object -ExpandProperty Content
```

## Step 7: Check Backend Logs (to see if Zerodha is enabled)
```bash
docker logs zerodha-backend --tail 50
```

## Step 8: Test Zerodha API (This may take 30-60 seconds on first call)
```bash
curl http://localhost:9000/api/real-derivatives?underlying=NIFTY
```
Or on Windows PowerShell:
```powershell
Invoke-WebRequest http://localhost:9000/api/real-derivatives?underlying=NIFTY | Select-Object -ExpandProperty Content
```

## Step 9: Check Recent Logs for Errors
```bash
docker logs zerodha-backend --tail 100 | grep -i "error\|exception\|zerodha"
```
Or on Windows PowerShell:
```powershell
docker logs zerodha-backend --tail 100 | Select-String -Pattern "error|Error|ERROR|exception|Exception|zerodha|Zerodha"
```

---

## Quick All-in-One Commands (Windows PowerShell)

```powershell
# Step 1-3: Stop, Rebuild, Start
docker-compose stop backend
docker-compose build --no-cache backend
docker-compose up -d backend

# Step 4: Wait
Start-Sleep -Seconds 30

# Step 5: Check status
docker-compose ps backend

# Step 6: Check Zerodha config
Invoke-WebRequest http://localhost:9000/api/zerodha/status | Select-Object -ExpandProperty Content

# Step 7: Check logs
docker logs zerodha-backend --tail 50

# Step 8: Test API
Invoke-WebRequest http://localhost:9000/api/real-derivatives?underlying=NIFTY | Select-Object -ExpandProperty Content

# Step 9: Check for errors
docker logs zerodha-backend --tail 100 | Select-String -Pattern "error|Error|ERROR|exception|Exception|zerodha|Zerodha"
```

---

## What to Look For

### In Step 6 (Status Check):
- Should show: `"zerodha_enabled": true`
- Should show: `"api_key_configured": true`
- Should show: `"api_secret_configured": true`

### In Step 8 (API Test):
- Should show: `"dataSource": "ZERODHA_KITE"` (not "NO_DATA")
- Should show: `"futures"` array with data
- Should show: `"callOptions"` array with data
- Should show: `"putOptions"` array with data

### In Step 9 (Error Check):
- Look for any "ERROR" or "Exception" messages
- Look for "Zerodha" related messages to see what's happening

---

## If Something Goes Wrong

1. **Backend won't start:** Check logs with `docker logs zerodha-backend`
2. **Zerodha still disabled:** Check environment variables with `docker exec zerodha-backend env | grep ZERODHA`
3. **API returns NO_DATA:** Check logs for API call errors
4. **Build fails:** Check for compilation errors in the build output

