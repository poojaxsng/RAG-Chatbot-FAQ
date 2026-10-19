import { useEffect, useRef, useState } from 'react'

export interface Countdown {
  remaining: number
  total: number
  paused: boolean
  toggle: () => void
  restart: () => void
}

/**
 * Second-by-second countdown. Starts as soon as it mounts and calls
 * `onComplete` exactly once when it reaches zero. Give the host component a
 * `key` when switching between timed stages so state resets on remount.
 */
export function useCountdown(total: number, onComplete: () => void): Countdown {
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  const [remaining, setRemaining] = useState(total)
  const [paused, setPaused] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    if (paused || remaining <= 0) return
    const id = setTimeout(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearTimeout(id)
  }, [paused, remaining])

  useEffect(() => {
    if (!paused && remaining === 0 && !doneRef.current) {
      doneRef.current = true
      onCompleteRef.current()
    }
  }, [paused, remaining])

  const toggle = () => setPaused((p) => !p)
  const restart = () => {
    doneRef.current = false
    setPaused(false)
    setRemaining(total)
  }

  return { remaining, total, paused, toggle, restart }
}
