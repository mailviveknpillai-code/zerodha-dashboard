import { useCallback, useRef, useState, useEffect } from 'react';
import { getLatestMetrics } from '../api/client';
import useContinuousPolling from './useContinuousPolling';
import logger from '../utils/logger';

/**
 * Hook to poll the /api/metrics/latest endpoint for windowed metric results.
 * 
 * This hook:
 * - Fetches metrics with window metadata (window_start, window_end, status, version, etc.)
 * - Only displays final values (status === "final")
 * - Uses version/window_end to detect when values have changed
 * - Respects next_expected_update to optimize polling
 * 
 * @param {Object} options
 * @param {string} options.symbol - Symbol identifier (default: "NIFTY")
 * @param {number} options.intervalMs - Polling interval in milliseconds
 * @param {string[]} options.features - Optional list of features to fetch
 * @param {Function} options.onConnectionStatusChange - Callback for connection status changes
 */
export default function useMetricsFeed({
  symbol = 'NIFTY',
  intervalMs,
  features = null, // null = fetch all features
  onConnectionStatusChange,
}) {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const latestMetricsRef = useRef({});
  const versionCacheRef = useRef({}); // Track last seen versions per feature
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef(null);

  const loadMetrics = useCallback(async () => {
    // Prevent overlapping fetches
    if (inFlightRef.current) {
      logger.debug('[useMetricsFeed] Request already in flight, skipping');
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      inFlightRef.current = true;
      const requestStartTime = Date.now();
      logger.debug(`[useMetricsFeed] Fetching metrics for ${symbol} at ${new Date().toISOString()}`);
      
      setLoading(true);

      const response = await getLatestMetrics(symbol, features);
      const requestDuration = Date.now() - requestStartTime;
      logger.debug(`[useMetricsFeed] Metrics fetch completed in ${requestDuration}ms`);

      if (!response || !response.features) {
        throw new Error('No metrics data returned');
      }

      // Process metrics: only use final values, check version for changes
      const processedMetrics = {};
      let hasNewData = false;

      for (const [feature, metricResult] of Object.entries(response.features)) {
        if (!metricResult) {
          continue;
        }

        // Only use final values for display
        if (metricResult.status === 'final') {
          const lastVersion = versionCacheRef.current[feature] || 0;
          const currentVersion = metricResult.version || 0;

          // Check if this is a new version
          if (currentVersion > lastVersion) {
            versionCacheRef.current[feature] = currentVersion;
            processedMetrics[feature] = metricResult;
            hasNewData = true;
            logger.debug(`[useMetricsFeed] New final value for ${feature}: version=${currentVersion}, value=${metricResult.value}`);
          } else {
            // Use last known value if version hasn't changed
            processedMetrics[feature] = latestMetricsRef.current[feature] || metricResult;
          }
        } else if (metricResult.status === 'partial') {
          // For partial values, only update if we don't have a final value yet
          if (!latestMetricsRef.current[feature] || latestMetricsRef.current[feature].status !== 'final') {
            processedMetrics[feature] = metricResult;
            hasNewData = true;
          } else {
            // Keep the last final value
            processedMetrics[feature] = latestMetricsRef.current[feature];
          }
        } else if (metricResult.status === 'missing' || metricResult.status === 'pending') {
          // Keep last known value if available
          if (latestMetricsRef.current[feature]) {
            processedMetrics[feature] = latestMetricsRef.current[feature];
          }
        }
      }

      // Update ref and state
      if (hasNewData || Object.keys(processedMetrics).length > 0) {
        latestMetricsRef.current = processedMetrics;
        setMetrics(processedMetrics);
      }

      onConnectionStatusChange?.(null);
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError' || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        return;
      }

      logger.error('[useMetricsFeed] Error fetching metrics:', error);

      onConnectionStatusChange?.({
        type: 'error',
        message: error.message || 'Failed to fetch metrics',
      });

      // Use last known metrics on error
      if (Object.keys(latestMetricsRef.current).length > 0) {
        setMetrics(latestMetricsRef.current);
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      // Clear abort controller if this was the active request
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [symbol, features, onConnectionStatusChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useContinuousPolling(loadMetrics, intervalMs, [symbol, features]);

  return { metrics, loading };
}



