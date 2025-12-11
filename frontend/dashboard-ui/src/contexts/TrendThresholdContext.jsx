import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getTrendCalculationThresholds, updateTrendCalculationThresholds } from '../api/client';
import logger from '../utils/logger';

const TrendThresholdContext = createContext(null);

export function TrendThresholdProvider({ children }) {
  // Default thresholds: Bullish >= 3, Bearish <= -3
  const [bullishThreshold, setBullishThresholdState] = useState(3);
  const [bearishThreshold, setBearishThresholdState] = useState(-3);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial thresholds from backend (priority) or localStorage (fallback)
  useEffect(() => {
    const loadThresholds = async () => {
      try {
        // First try to load from backend
        const thresholds = await getTrendCalculationThresholds();
        if (thresholds && thresholds.bullishThreshold != null && thresholds.bearishThreshold != null) {
          setBullishThresholdState(thresholds.bullishThreshold);
          setBearishThresholdState(thresholds.bearishThreshold);
          // Save to localStorage
          localStorage.setItem('trendBullishThreshold', String(thresholds.bullishThreshold));
          localStorage.setItem('trendBearishThreshold', String(thresholds.bearishThreshold));
          logger.debug('TrendThreshold: Loaded thresholds from backend:', thresholds);
        } else {
          // Fallback to localStorage if backend doesn't have values
          const savedBullish = localStorage.getItem('trendBullishThreshold');
          const savedBearish = localStorage.getItem('trendBearishThreshold');
          
          if (savedBullish) {
            const parsed = parseFloat(savedBullish);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
              setBullishThresholdState(parsed);
              // Sync with backend
              updateTrendCalculationThresholds(parsed, null).catch(err => {
                logger.warn('TrendThreshold: Failed to sync bullish threshold with backend:', err);
              });
            }
          }
          
          if (savedBearish) {
            const parsed = parseFloat(savedBearish);
            if (!isNaN(parsed) && parsed >= -10 && parsed <= -1) {
              setBearishThresholdState(parsed);
              // Sync with backend
              updateTrendCalculationThresholds(null, parsed).catch(err => {
                logger.warn('TrendThreshold: Failed to sync bearish threshold with backend:', err);
              });
            }
          }
        }
      } catch (error) {
        logger.error('TrendThreshold: Failed to load thresholds from backend:', error);
        // Fallback to localStorage on error
        const savedBullish = localStorage.getItem('trendBullishThreshold');
        const savedBearish = localStorage.getItem('trendBearishThreshold');
        
        if (savedBullish) {
          const parsed = parseFloat(savedBullish);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
            setBullishThresholdState(parsed);
          }
        }
        
        if (savedBearish) {
          const parsed = parseFloat(savedBearish);
          if (!isNaN(parsed) && parsed >= -10 && parsed <= -1) {
            setBearishThresholdState(parsed);
          }
        }
      }
    };

    loadThresholds();
  }, []);

  const setBullishThreshold = useCallback(async (value) => {
    if (value < 1 || value > 10) {
      logger.warn('TrendThreshold: Invalid bullish threshold, must be between 1 and 10:', value);
      return;
    }

    setIsLoading(true);
    try {
      const updated = await updateTrendCalculationThresholds(value, null);
      if (updated && updated.bullishThreshold != null) {
        setBullishThresholdState(updated.bullishThreshold);
        localStorage.setItem('trendBullishThreshold', String(updated.bullishThreshold));
        logger.info('TrendThreshold: Updated bullish threshold to:', updated.bullishThreshold);
      }
    } catch (error) {
      logger.error('TrendThreshold: Failed to update bullish threshold:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setBearishThreshold = useCallback(async (value) => {
    if (value < -10 || value > -1) {
      logger.warn('TrendThreshold: Invalid bearish threshold, must be between -10 and -1:', value);
      return;
    }

    setIsLoading(true);
    try {
      const updated = await updateTrendCalculationThresholds(null, value);
      if (updated && updated.bearishThreshold != null) {
        setBearishThresholdState(updated.bearishThreshold);
        localStorage.setItem('trendBearishThreshold', String(updated.bearishThreshold));
        logger.info('TrendThreshold: Updated bearish threshold to:', updated.bearishThreshold);
      }
    } catch (error) {
      logger.error('TrendThreshold: Failed to update bearish threshold:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const contextValue = {
    bullishThreshold,
    bearishThreshold,
    setBullishThreshold,
    setBearishThreshold,
    isLoading,
  };

  return (
    <TrendThresholdContext.Provider value={contextValue}>
      {children}
    </TrendThresholdContext.Provider>
  );
}

export function useTrendThreshold() {
  const context = useContext(TrendThresholdContext);
  if (!context) {
    throw new Error('useTrendThreshold must be used within TrendThresholdProvider');
  }
  return context;
}


