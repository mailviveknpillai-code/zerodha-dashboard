// ============================================================================
// Zerodha Dashboard Electron Launcher
// ============================================================================
// Opens the dashboard in a native window, with connection status monitoring
// ============================================================================

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

let mainWindow;
let publicHostname = null;
let localUrl = 'http://127.0.0.1:9000';
let publicUrl = null;

// Load installation metadata to get public hostname
function loadInstallationMetadata() {
    const metadataPath = path.join('C:', 'Program Files', 'ZerodhaDashboard', 'installation-metadata.json');
    try {
        if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            publicHostname = metadata.publicHostname;
            publicUrl = `https://${publicHostname}`;
            console.log('Loaded public hostname:', publicHostname);
        }
    } catch (error) {
        console.error('Failed to load installation metadata:', error);
    }
}

// Check backend health with retries
async function checkBackendHealth(maxRetries = 3, retryDelay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(`${localUrl}/api/zerodha/status`, {
                timeout: 10000, // Increased to 10 seconds
                validateStatus: () => true // Don't throw on any status
            });
            if (response.status === 200) {
                console.log(`Backend health check passed on attempt ${attempt}`);
                return true;
            }
        } catch (error) {
            console.log(`Backend health check attempt ${attempt} failed:`, error.message);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    return false;
}

// Check public URL accessibility
async function checkPublicUrl() {
    if (!publicUrl) return false;
    try {
        const response = await axios.get(`${publicUrl}/api/zerodha/status`, {
            timeout: 10000,
            validateStatus: () => true // Don't throw on any status
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.ico'),
        show: false, // Don't show until ready
        titleBarStyle: 'default'
    });

    // Load installation metadata
    loadInstallationMetadata();

    // Determine which URL to use
    async function loadDashboard() {
        // First, try to check local backend
        const localHealthy = await checkBackendHealth();
        
        if (localHealthy) {
            // If local is healthy, prefer public URL if available, otherwise use local
            if (publicUrl) {
                const publicHealthy = await checkPublicUrl();
                if (publicHealthy) {
                    console.log('Using public URL:', publicUrl);
                    mainWindow.loadURL(publicUrl);
                } else {
                    console.log('Public URL not accessible, using local URL:', localUrl);
                    mainWindow.loadURL(localUrl);
                }
            } else {
                console.log('Using local URL:', localUrl);
                mainWindow.loadURL(localUrl);
            }
        } else {
            // Backend not healthy, show error page
            showErrorPage('Backend service is not running. Please check the services and try again.');
        }
        
        mainWindow.show();
    }

    // Load dashboard after a short delay to allow services to start
    // Increased delay to give backend more time to initialize
    setTimeout(loadDashboard, 3000);

    // Monitor connection status
    setInterval(async () => {
        const healthy = await checkBackendHealth();
        if (!healthy && mainWindow) {
            mainWindow.webContents.send('connection-status', { connected: false });
        } else if (healthy && mainWindow) {
            mainWindow.webContents.send('connection-status', { connected: true });
        }
    }, 10000); // Check every 10 seconds

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });
}

function showErrorPage(message) {
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Connection Error - Zerodha Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .error-container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
            max-width: 500px;
        }
        h1 { margin-top: 0; }
        .message { margin: 20px 0; }
        button {
            background: white;
            color: #667eea;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
        }
        button:hover {
            background: #f0f0f0;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>⚠️ Connection Error</h1>
        <div class="message">${message}</div>
        <button onclick="location.reload()">Retry</button>
        <button onclick="window.electronAPI?.openSupport()">Get Support</button>
    </div>
</body>
</html>
    `;
    
    if (mainWindow) {
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }
}

// IPC handlers
ipcMain.handle('get-connection-status', async () => {
    const localHealthy = await checkBackendHealth();
    const publicHealthy = publicUrl ? await checkPublicUrl() : false;
    return {
        local: localHealthy,
        public: publicHealthy,
        publicUrl: publicUrl,
        localUrl: localUrl
    };
});

ipcMain.handle('restart-services', async () => {
    const { exec } = require('child_process');
    const scriptPath = path.join('C:', 'Program Files', 'ZerodhaDashboard', 'installer', 'scripts', 'restart-services.ps1');
    
    return new Promise((resolve, reject) => {
        exec(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
});

ipcMain.handle('collect-logs', async () => {
    const { exec } = require('child_process');
    const scriptPath = path.join('C:', 'Program Files', 'ZerodhaDashboard', 'installer', 'scripts', 'collect_logs.ps1');
    
    return new Promise((resolve, reject) => {
        exec(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
});

ipcMain.handle('open-support', () => {
    require('electron').shell.openExternal('https://yourdomain.com/support');
});

ipcMain.handle('open-external', (event, url) => {
    if (url && typeof url === 'string') {
        require('electron').shell.openExternal(url);
        return { success: true };
    }
    return { success: false, error: 'Invalid URL' };
});

// Set user data directory to avoid cache permission issues
// Note: path is already required at the top of the file
const os = require('os');
const userDataPath = path.join(os.homedir(), 'AppData', 'Local', 'ZerodhaDashboard');
app.setPath('userData', userDataPath);

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle certificate errors (for self-signed certs during development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // In production, you might want to validate certificates properly
    // For now, we'll allow Cloudflare certificates
    if (url.includes('yourdomain.com') || url.includes('cloudflare')) {
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

