import { useEffect, useRef } from 'react'

export default function useContinuousPolling(asyncTask, intervalMs, deps = []) {
  const timerRef = useRef(null)
  const inFlightRef = useRef(false)

  useEffect(() => {
    let active = true

    const invoke = async () => {
      if (!active || inFlightRef.current) {
        return
      }

      inFlightRef.current = true
      try {
        await asyncTask()
      } finally {
        inFlightRef.current = false
        if (active) {
          timerRef.current = setTimeout(invoke, intervalMs)
        }
      }
    }

    invoke()

    return () => {
      active = false
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asyncTask, intervalMs, ...deps])
}
