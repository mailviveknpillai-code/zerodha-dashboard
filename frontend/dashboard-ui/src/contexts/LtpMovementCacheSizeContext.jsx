import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getLtpMovementCacheSize, updateLtpMovementCacheSize } from '../api/client';
import logger from '../utils/logger';

const LtpMovementCacheSizeContext = createContext();

export function LtpMovementCacheSizeProvider({ children }) {
  const [cacheSize, setCacheSize] = useState(5); // Default: 5 movements
  const [isLoading, setIsLoading] = useState(false);

  // Load initial cache size from backend
  useEffect(() => {
    const loadCacheSize = async () => {
      try {
        const size = await getLtpMovementCacheSize();
        setCacheSize(size);
        logger.debug('LtpMovementCacheSize: Loaded initial cache size from backend:', size);
      } catch (error) {
        logger.error('LtpMovementCacheSize: Failed to load cache size from backend:', error);
        // Keep default value on error
      }
    };

    loadCacheSize();
  }, []);

  // Update cache size (syncs with backend and persists to localStorage)
  const setCacheSizeValue = useCallback(async (newSize) => {
    if (newSize < 2 || newSize > 20) {
      logger.warn('LtpMovementCacheSize: Invalid cache size, must be between 2 and 20:', newSize);
      return;
    }

    setIsLoading(true);
    try {
      const updatedSize = await updateLtpMovementCacheSize(newSize);
      setCacheSize(updatedSize);
      
      // Persist to localStorage
      localStorage.setItem('ltpMovementCacheSize', String(updatedSize));
      
      logger.info('LtpMovementCacheSize: Updated cache size to:', updatedSize);
    } catch (error) {
      logger.error('LtpMovementCacheSize: Failed to update cache size:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load from localStorage on mount (if available)
  useEffect(() => {
    const savedSize = localStorage.getItem('ltpMovementCacheSize');
    if (savedSize) {
      const parsedSize = parseInt(savedSize, 10);
      if (!isNaN(parsedSize) && parsedSize >= 2 && parsedSize <= 20) {
        setCacheSize(parsedSize);
        // Sync with backend (but don't wait for it)
        updateLtpMovementCacheSize(parsedSize).catch(err => {
          logger.warn('LtpMovementCacheSize: Failed to sync with backend:', err);
        });
      }
    }
  }, []);

  return (
    <LtpMovementCacheSizeContext.Provider
      value={{
        cacheSize,
        setCacheSize: setCacheSizeValue,
        isLoading,
      }}
    >
      {children}
    </LtpMovementCacheSizeContext.Provider>
  );
}

export function useLtpMovementCacheSize() {
  const context = useContext(LtpMovementCacheSizeContext);
  if (!context) {
    throw new Error('useLtpMovementCacheSize must be used within LtpMovementCacheSizeProvider');
  }
  return context;
}



