import { useEffect, useRef } from 'react'
import logger from '../utils/logger'

export default function useContinuousPolling(asyncTask, intervalMs, deps = []) {
  const timerRef = useRef(null)
  const inFlightRef = useRef(false)
  const intervalMsRef = useRef(intervalMs)
  const activeRef = useRef(true)
  const asyncTaskRef = useRef(asyncTask)
  const lastIntervalMsRef = useRef(intervalMs)
  const effectIdRef = useRef(0) // Track effect instances to prevent stale closures

  // Always keep refs up to date
  useEffect(() => {
    intervalMsRef.current = intervalMs
    asyncTaskRef.current = asyncTask
  }, [intervalMs, asyncTask])

  // Main polling effect - restarts when intervalMs changes
  useEffect(() => {
    // Increment effect ID to invalidate any stale timers
    effectIdRef.current += 1
    const currentEffectId = effectIdRef.current
    
    const intervalChanged = lastIntervalMsRef.current !== intervalMs
    lastIntervalMsRef.current = intervalMs
    
    if (intervalChanged) {
      logger.info(`[useContinuousPolling] Interval changed to ${intervalMs}ms (${(intervalMs / 1000).toFixed(2)}s) - restarting polling`)
    } else {
      logger.info(`[useContinuousPolling] Starting polling with interval ${intervalMs}ms (${(intervalMs / 1000).toFixed(2)}s)`)
    }
    
    activeRef.current = true

    // Clear existing timer to ensure no polling happens between intervals
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const invoke = async () => {
      // Check if this effect instance is still active
      // This is expected when the interval changes - the old effect should not start new requests
      if (effectIdRef.current !== currentEffectId) {
        logger.debug(`[useContinuousPolling] Effect instance superseded (interval changed), aborting request`)
        return
      }
      
      if (!activeRef.current) {
        return
      }
      
      // Record the start time to measure actual interval
      const requestStartTime = Date.now()
      
      // Set inFlightRef - this is safe even if there's an old request
      // because useLatestDerivativesFeed has its own in-flight protection
      // and will skip the actual request if one is already in-flight
      inFlightRef.current = true
      
      try {
        await asyncTaskRef.current()
      } finally {
        inFlightRef.current = false
        
        // Check again if this effect instance is still active before scheduling next poll
        // This is expected when the interval changes - the old effect should not schedule new polls
        if (effectIdRef.current !== currentEffectId) {
          logger.debug(`[useContinuousPolling] Effect instance superseded (interval changed), not scheduling next poll`)
          return
        }
        
        // Schedule next poll using the exact interval from ref
        // Calculate delay to maintain exact interval from request start time
        if (activeRef.current) {
          const nextInterval = intervalMsRef.current
          const requestDuration = Date.now() - requestStartTime
          const delayUntilNext = Math.max(0, nextInterval - requestDuration)
          
          logger.debug(`[useContinuousPolling] Request took ${requestDuration}ms, scheduling next poll in ${delayUntilNext}ms (total interval: ${nextInterval}ms)`)
          timerRef.current = setTimeout(invoke, delayUntilNext)
        }
      }
    }

    // Start polling immediately when interval changes
    // When interval changes, we want the new effect to start polling right away
    // The old effect's request will finish but won't schedule new polls (effectIdRef check)
    // useLatestDerivativesFeed has its own in-flight protection, so it's safe to call invoke()
    // even if there's an in-flight request from the old effect
    const startPolling = () => {
      // Check if this effect is still active before starting
      if (effectIdRef.current !== currentEffectId || !activeRef.current) {
        return
      }
      
      // Start polling immediately
      // If there's an in-flight request from the old effect, wait briefly (50ms) then start
      // useLatestDerivativesFeed will handle preventing duplicate requests
      // This ensures the new interval takes effect promptly
      if (inFlightRef.current) {
        // Wait briefly for old request to potentially finish
        timerRef.current = setTimeout(() => {
          if (effectIdRef.current === currentEffectId && activeRef.current) {
            invoke()
          }
        }, 50)
      } else {
        // No in-flight request, start immediately
        invoke()
      }
    }
    
    startPolling()

    return () => {
      // Mark this effect instance as inactive
      activeRef.current = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      // Don't reset inFlightRef here - let current request finish naturally
      // Don't increment effectIdRef here - it's already incremented when new effect starts
      // This prevents in-flight requests from being incorrectly marked as stale
    }
  // Restart when intervalMs changes (don't restart on asyncTask changes to avoid unnecessary restarts)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs])
  
  // Separate effect to update asyncTask ref without restarting polling
  useEffect(() => {
    asyncTaskRef.current = asyncTask
  }, [asyncTask])
}

