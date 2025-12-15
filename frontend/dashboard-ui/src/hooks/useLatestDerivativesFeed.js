import { useCallback, useRef, useState, useEffect } from 'react'
import { fetchBasic, fetchLatest } from '../api/client'
import useContinuousPolling from './useContinuousPolling'
import logger from '../utils/logger'

/**
 * Hook to poll endpoints for derivatives data.
 * 
 * If useBasic=true: Polls /api/basic for basic values only (8 columns) at UI refresh rate.
 * If useBasic=false: Polls /api/latest for enriched data (basic + metrics) - backward compatibility.
 * 
 * CRITICAL: When useBasic=true, this hook returns ONLY basic values from API polling - NO calculated metrics.
 * Use useMetricsFeed hook separately to get calculated metrics at their own intervals.
 */
export default function useLatestDerivativesFeed({
  symbol = 'NIFTY',
  intervalMs,
  onConnectionStatusChange,
  onAuthFailure,
  fallbackToFullFetch = true, // Fallback to full fetch if cache is empty
  useBasic = true, // If true, use /api/basic; if false, use /api/latest (backward compatibility)
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const latestDataRef = useRef(null)
  const initialLoadRef = useRef(true)
  const consecutiveCacheMissesRef = useRef(0)
  const inFlightRef = useRef(false)
  const abortControllerRef = useRef(null)

  const loadLatest = useCallback(async () => {
    // Prevent overlapping fetches
    if (inFlightRef.current) {
      logger.debug('[useLatestDerivativesFeed] Request already in flight, skipping')
      return
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      inFlightRef.current = true
      const requestStartTime = Date.now()
      const endpoint = useBasic ? '/api/basic' : '/api/latest'
      logger.debug(`[useLatestDerivativesFeed] Fetching ${endpoint} for ${symbol} at ${new Date().toISOString()}`)
      
      if (initialLoadRef.current) {
        setLoading(true)
      }

      const payload = useBasic 
        ? await fetchBasic(symbol, abortController.signal)
        : await fetchLatest(symbol, abortController.signal)
      const requestDuration = Date.now() - requestStartTime
      logger.debug(`[useLatestDerivativesFeed] ${endpoint} fetch completed in ${requestDuration}ms`)

      if (!payload) {
        throw new Error('No data returned from latest endpoint')
      }

      const futuresCount = Array.isArray(payload.futures) ? payload.futures.length : 0
      const callCount = Array.isArray(payload.callOptions) ? payload.callOptions.length : 0
      const putCount = Array.isArray(payload.putOptions) ? payload.putOptions.length : 0
      const hasContracts = futuresCount + callCount + putCount > 0

      // Check if this is a cache miss (NO_DATA source)
      if (payload.dataSource === 'NO_DATA' || !hasContracts) {
        consecutiveCacheMissesRef.current += 1
        
        // If cache is consistently empty and fallback is enabled, trigger full fetch
        if (fallbackToFullFetch && consecutiveCacheMissesRef.current >= 3 && latestDataRef.current) {
          // Keep using cached data, but log the issue
          console.warn('Cache consistently empty, but using last known data')
          setData(latestDataRef.current)
          return
        }
        
        // Use last known data if available
        if (latestDataRef.current) {
          setData(latestDataRef.current)
          return
        }
      } else {
        // Cache hit - reset miss counter
        consecutiveCacheMissesRef.current = 0
      }

      // Update ref and state with latest payload
      latestDataRef.current = payload
      setData(payload)

      if (hasContracts) {
        onConnectionStatusChange?.(null)
      } else {
        onConnectionStatusChange?.({
          type: 'no-data',
          message: 'Cache is empty. Waiting for initial data fetch.',
        })
      }
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError' || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        return
      }
      
      if (error?.response?.status === 401) {
        onAuthFailure?.()
        return
      }

      onConnectionStatusChange?.({
        type: 'error',
        message: deriveConnectionErrorMessage(error),
      })

      // Use last known data on error
      if (latestDataRef.current) {
        setData(latestDataRef.current)
      } else {
        setData({
          underlying: symbol,
          spotPrice: null,
          dailyStrikePrice: null,
          futures: [],
          callOptions: [],
          putOptions: [],
          totalContracts: 0,
          dataSource: 'ERROR',
        })
      }
    } finally {
      inFlightRef.current = false
      initialLoadRef.current = false
      setLoading(false)
      // Clear abort controller if this was the active request
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }, [symbol, onConnectionStatusChange, onAuthFailure, fallbackToFullFetch, useBasic])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useContinuousPolling(loadLatest, intervalMs, [symbol])

  return { data, loading }
}

function deriveConnectionErrorMessage(error) {
  if (!error) return 'Unknown error'
  if (error.response) {
    const { status } = error.response
    if (status === 429) return 'API rate limit reached. Pausing updates briefly.'
    if (status === 401) return 'Session expired. Please login again to resume live data.'
    if (status >= 500) return 'Server error. Waiting for recovery.'
    return `API responded with status ${status}. Retrying shortly.`
  }
  if (error.request) {
    return 'Network interruption detected. Trying to reconnect.'
  }
  return error.message || 'Unexpected error contacting API.'
}

