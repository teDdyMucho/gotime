import { useEffect, useRef, useCallback } from 'react'

const IDLE_MS = 30 * 60 * 1000       // 30 minutes → sign out
const WARN_MS = 25 * 60 * 1000       // 25 minutes → show warning

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const

export function useIdleTimeout(onWarn: () => void, onExpire: () => void) {
  const idleTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    if (idleTimer.current)  clearTimeout(idleTimer.current)
    if (warnTimer.current)  clearTimeout(warnTimer.current)

    warnTimer.current  = setTimeout(onWarn,   WARN_MS)
    idleTimer.current  = setTimeout(onExpire, IDLE_MS)
  }, [onWarn, onExpire])

  useEffect(() => {
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, reset))
      if (idleTimer.current)  clearTimeout(idleTimer.current)
      if (warnTimer.current)  clearTimeout(warnTimer.current)
    }
  }, [reset])
}
