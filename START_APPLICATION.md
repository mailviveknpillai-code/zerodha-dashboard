# 🚀 Start Application Guide

## ✅ Setup Complete!

Your Zerodha Dashboard application is fully configured and ready to use!

## Current Status

- ✅ **Backend:** Running on port 9000
- ✅ **Redis:** Running
- ✅ **Zerodha OAuth:** Complete
- ✅ **Access Token:** Configured and saved
- ✅ **Frontend:** Ready to start

## Quick Start

### Option 1: Development Mode (Recommended)

1. **Start Frontend:**
   ```bash
   cd frontend/dashboard-ui
   npm install
   npm run dev
   ```

2. **Open Browser:**
   ```
   http://localhost:5173
   ```

### Option 2: Docker Compose

```bash
docker-compose up -d frontend-dev
```

Then open: http://localhost:5174

## Application URLs

### Frontend Dashboard
- **Development:** http://localhost:5173
- **Docker:** http://localhost:5174

### Backend API
- **Local:** http://localhost:9000
- **Public:** https://aka-steps-blah-speakers.trycloudflare.com

## API Endpoints

### Zerodha Status
```
GET http://localhost:9000/api/zerodha/status
```

### Get Derivatives Data
```
GET http://localhost:9000/api/real-derivatives?underlying=NIFTY
```

### Health Check
```
GET http://localhost:9000/api/health
```

### Strike Price Monitoring
```
GET http://localhost:9000/api/strike-monitoring?underlying=NIFTY
```

## Configuration

### Zerodha API
- **API Key:** hvgaaodyzyhzq57s
- **API Secret:** r6t8jx9lk6xb1vrckgwrqi4owjd2u314
- **Access Token:** jQFoDt6fJTmrJBKAy3QQg6G200vpg3AR
- **Redirect URI:** https://aka-steps-blah-speakers.trycloudflare.com/api/zerodha/callback

### Ports
- **Backend:** 9000
- **Frontend (Dev):** 5173
- **Frontend (Docker):** 5174
- **Redis:** 6379

## Troubleshooting

### Frontend not loading
- Check if frontend is running: Look for the PowerShell window with `npm run dev`
- Verify port 5173 is not in use: `netstat -ano | findstr :5173`
- Check frontend logs in the terminal

### API calls failing
- Verify backend is running: `http://localhost:9000/api/zerodha/status`
- Check backend logs: `docker-compose logs backend`
- Verify access token is valid (may expire)

### No data showing
- Check API health: `http://localhost:9000/api/health`
- Verify Zerodha API is enabled
- Test API endpoint directly: `http://localhost:9000/api/real-derivatives?underlying=NIFTY`

## Next Steps

1. ✅ OAuth authentication complete
2. ✅ Access token received and saved
3. ✅ Backend configured and running
4. ⏭️ Start frontend
5. ⏭️ Test dashboard functionality
6. ⏭️ Verify data is being fetched from Zerodha API

## Status

✅ **OAuth:** Complete
✅ **Backend:** Running
✅ **API Connection:** Ready
✅ **Access Token:** Saved
⏭️ **Frontend:** Ready to start
⏭️ **Application:** Ready to use

Your application is ready! Start the frontend and begin using the dashboard!

