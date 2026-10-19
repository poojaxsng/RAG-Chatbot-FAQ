import type { SessionLog } from '../types'

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

/** Consecutive days (ending today or yesterday) with at least one completed session. */
export function currentStreak(log: readonly SessionLog[], now = new Date()): number {
  if (log.length === 0) return 0
  const days = new Set(log.map((e) => dayKey(e.completedAt)))
  let streak = 0
  const cursor = new Date(now)
  // Allow the streak to count if the most recent session was today or yesterday.
  if (!days.has(toKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(toKey(cursor))) return 0
  }
  while (days.has(toKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function totalReps(log: readonly SessionLog[]): number {
  return log.length
}
