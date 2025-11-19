import React, { createContext, useContext, useState, useCallback } from 'react';

const VolumeWindowContext = createContext(null);

export function VolumeWindowProvider({ children }) {
  const [volumeWindowMinutes, setVolumeWindowMinutes] = useState(5); // Default 5 minutes

  const setVolumeWindow = useCallback((minutes) => {
    if (minutes >= 1 && minutes <= 10) {
      setVolumeWindowMinutes(minutes);
    }
  }, []);

  const volumeWindowMs = volumeWindowMinutes * 60 * 1000;

  const contextValue = {
    volumeWindowMinutes,
    volumeWindowMs,
    setVolumeWindow,
  };

  return (
    <VolumeWindowContext.Provider value={contextValue}>
      {children}
    </VolumeWindowContext.Provider>
  );
}

export function useVolumeWindow() {
  const context = useContext(VolumeWindowContext);
  if (!context) {
    throw new Error('useVolumeWindow must be used within VolumeWindowProvider');
  }
  return context;
}


