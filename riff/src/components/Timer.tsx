import { useEffect, useRef } from 'react'
import { useCountdown } from '../hooks/useCountdown'
import { formatClock } from '../lib/format'
import { playCue } from '../lib/audio'
import { IconPause, IconPlay, IconRestart } from './icons'

interface TimerProps {
  seconds: number
  label: string
  hint?: string
  sound: boolean
  onComplete: () => void
}

const RADIUS = 76
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function Timer({ seconds, label, hint, sound, onComplete }: TimerProps) {
  const startedRef = useRef(false)
  const tickedRef = useRef(false)

  const handleComplete = () => {
    playCue('end', sound)
    onComplete()
  }

  const { remaining, total, paused, toggle, restart } = useCountdown(seconds, handleComplete)

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true
      playCue('start', sound)
    }
  }, [sound])

  useEffect(() => {
    if (remaining === 10 && !tickedRef.current) {
      tickedRef.current = true
      playCue('tick', sound)
    }
  }, [remaining, sound])

  const fraction = total > 0 ? remaining / total : 0
  const offset = CIRCUMFERENCE * (1 - fraction)

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="relative h-48 w-48">
        <svg viewBox="0 0 176 176" className="h-full w-full -rotate-90">
          <circle cx="88" cy="88" r={RADIUS} fill="none" stroke="#22301f" strokeWidth="10" />
          <circle
            cx="88"
            cy="88"
            r={RADIUS}
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            role="timer"
            className="font-display text-5xl font-semibold tabular-nums tracking-tight text-white"
          >
            {formatClock(remaining)}
          </span>
          <span className="mt-1 text-xs uppercase tracking-[0.2em] text-brand">{label}</span>
        </div>
      </div>

      {hint && <p className="max-w-sm text-center text-sm text-zinc-400">{hint}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-soft px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-brand hover:text-white"
        >
          {paused ? <IconPlay /> : <IconPause />}
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={restart}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-soft px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-brand hover:text-white"
        >
          <IconRestart />
          Restart
        </button>
      </div>
    </div>
  )
}
