// ============================================================================
// Electron Preload Script
// ============================================================================
// Exposes safe APIs to the renderer process
// ============================================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Connection status
    getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),
    
    // Service management
    restartServices: () => ipcRenderer.invoke('restart-services'),
    
    // Support utilities
    collectLogs: () => ipcRenderer.invoke('collect-logs'),
    openSupport: () => ipcRenderer.invoke('open-support'),
    
    // Open external URL in system browser
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Connection status updates
    onConnectionStatus: (callback) => {
        ipcRenderer.on('connection-status', (event, data) => callback(data));
    }
});

