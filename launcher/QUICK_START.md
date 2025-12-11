# Quick Start Guide - JAR-based Deployment

## Complete Build & Run Flow

### Step 1: Build Everything (Backend + Frontend)
```powershell
.\build-with-frontend.ps1
```
This will:
- Build frontend React app
- Embed frontend in backend JAR
- Build backend JAR with embedded frontend
- Copy JAR to launcher directory

### Step 2: Build Launcher
```powershell
cd launcher
.\build-launcher.ps1
```

### Step 3: Create EXE (Optional)
```powershell
.\build-exe.ps1
```

## Result

You'll have:
- `launcher/dist/ZerodhaDashboard.exe` - Single launcher EXE
- `launcher/lib/dashboard-app-*.jar` - Backend JAR with embedded frontend

## Running

1. Place `ZerodhaDashboard.exe` in a directory
2. Ensure `cloudflared.exe` is accessible (in PATH or same directory)
3. Double-click `ZerodhaDashboard.exe`
4. GUI will show:
   - "Starting backend..."
   - "Backend ready. Starting tunnel..."
   - "✓ All services running"
5. Browser opens automatically to tunnel URL
6. Click "Exit" to shut down everything

## What Happens

1. **Backend starts** (port 9000) - serves both API and frontend
2. **Cloudflare tunnel starts** - creates public URL
3. **Browser opens** - automatically navigates to tunnel URL
4. **Frontend loads** - served by Spring Boot from embedded static files

## Requirements

- Java 21 installed
- `cloudflared.exe` accessible
- Redis running (or configure backend to use embedded Redis)

## Troubleshooting

- **Backend fails to start**: Check `backend.log` in launcher directory
- **Tunnel URL not extracted**: Check if cloudflared output format changed
- **Browser doesn't open**: Click "Open Dashboard" button manually
- **Frontend not loading**: Ensure frontend was embedded during build





