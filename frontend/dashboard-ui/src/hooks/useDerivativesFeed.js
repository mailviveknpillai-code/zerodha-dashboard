import { useCallback, useRef, useState } from 'react'
import { fetchDerivatives } from '../api/client'
import useContinuousPolling from './useContinuousPolling'

export default function useDerivativesFeed({
  symbol = 'NIFTY',
  intervalMs,
  onConnectionStatusChange,
  onAuthFailure,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const latestDataRef = useRef(null)
  const initialLoadRef = useRef(true)

  const loadDerivatives = useCallback(async () => {
    try {
      if (initialLoadRef.current) {
        setLoading(true)
      }

      const payload = await fetchDerivatives(symbol)

      if (!payload) {
        throw new Error('No data returned from derivatives endpoint')
      }

      const futuresCount = Array.isArray(payload.futures) ? payload.futures.length : 0
      const callCount = Array.isArray(payload.callOptions) ? payload.callOptions.length : 0
      const putCount = Array.isArray(payload.putOptions) ? payload.putOptions.length : 0
      const hasContracts = futuresCount + callCount + putCount > 0

      // Always use fresh data from API - no merging with stale cache
      // Update ref and state with latest payload
      latestDataRef.current = payload
      setData(payload)

      if (hasContracts) {
        onConnectionStatusChange?.(null)
      } else {
        onConnectionStatusChange?.({
          type: 'no-data',
          message:
            'Zerodha API did not return live contracts. Showing the last known prices until the feed recovers.',
        })
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        onAuthFailure?.()
        return
      }

      onConnectionStatusChange?.({
        type: 'error',
        message: deriveConnectionErrorMessage(error),
      })

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
      initialLoadRef.current = false
      setLoading(false)
    }
  }, [symbol, onConnectionStatusChange, onAuthFailure])

  useContinuousPolling(loadDerivatives, intervalMs, [symbol])

  return { data, loading }
}

export function deriveConnectionErrorMessage(error) {
  if (!error) return 'Unknown error'
  if (error.response) {
    const { status } = error.response
    if (status === 429) return 'Zerodha API rate limit reached. Pausing updates briefly.'
    if (status === 401) return 'Session expired with Zerodha. Please login again to resume live data.'
    if (status >= 500) return 'Zerodha API reported a server error. Waiting for recovery.'
    return `Zerodha API responded with status ${status}. Retrying shortly.`
  }
  if (error.request) {
    return 'Network interruption detected. Trying to reconnect to the Zerodha feed.'
  }
  return error.message || 'Unexpected error contacting Zerodha API.'
}



