# Dashboard Launcher

GUI launcher for Zerodha Dashboard that runs backend and tunnel in background.

## Features

- ✅ Single EXE icon to start everything
- ✅ Background processes (no terminal windows)
- ✅ Simple GUI with status and exit button
- ✅ Automatic tunnel URL extraction
- ✅ Clean shutdown on exit

## Building

### Step 1: Build Launcher JAR
```powershell
cd launcher
.\build-launcher.ps1
```

### Step 2: Build EXE (optional)
```powershell
.\build-exe.ps1
```

## Requirements

- Java 21 installed
- Backend JAR (`dashboard-app-*.jar`) in same directory or subdirectory
- `cloudflared.exe` accessible (in PATH or same directory)

## Directory Structure

```
launcher/
├── dist/
│   └── ZerodhaDashboard.exe  (after build)
├── target/
│   └── dashboard-launcher-1.0.0.jar
├── src/
│   └── main/java/com/zerodha/launcher/
│       └── DashboardLauncher.java
└── pom.xml
```

## Usage

1. Place `ZerodhaDashboard.exe` in a directory
2. Place backend JAR (`dashboard-app-*.jar`) in same directory or `backend/dashboard/target/`
3. Ensure `cloudflared.exe` is accessible
4. Double-click `ZerodhaDashboard.exe`
5. Wait for "All services running" status
6. Click "Open Dashboard" or use the tunnel URL shown
7. Click "Exit" to shut down everything

## How It Works

1. Launcher starts backend JAR in background (logs to `backend.log`)
2. Waits for backend health check
3. Starts Cloudflare tunnel in background
4. Extracts tunnel URL from tunnel output
5. Shows GUI with status
6. On exit, cleanly shuts down all processes


