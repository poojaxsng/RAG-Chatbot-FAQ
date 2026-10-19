import type { Topic } from '../types'
import { CATEGORY_LABELS } from './categories'

const VALID_MODES = new Set(['off-the-cuff', 'deep-research'])
const VALID_DIFFICULTY = new Set(['everyday', 'mixed', 'technical'])

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every(isNonEmptyString)
}

/** Runtime shape check for a topic loaded from JSON. */
export function isTopic(v: unknown): v is Topic {
  if (typeof v !== 'object' || v === null) return false
  const t = v as Record<string, unknown>
  if (!isNonEmptyString(t.id)) return false
  if (!isNonEmptyString(t.category) || !CATEGORY_LABELS.includes(t.category)) return false
  if (!isNonEmptyString(t.mode) || !VALID_MODES.has(t.mode)) return false
  if (!isNonEmptyString(t.difficulty) || !VALID_DIFFICULTY.has(t.difficulty)) return false
  if (!isNonEmptyString(t.prompt)) return false
  const c = t.card as Record<string, unknown> | undefined
  if (!c || !isNonEmptyString(c.oneLiner)) return false
  if (!isStringArray(c.keyPoints)) return false
  if (!isStringArray(c.whatYouCanDo)) return false
  if (!isNonEmptyString(c.caveats)) return false
  if (!isNonEmptyString(c.asOf)) return false
  if (!Array.isArray(c.framework) || c.framework.length === 0) return false
  if (!Array.isArray(c.sources) || c.sources.length === 0) return false
  return true
}

// Vite eagerly bundles every category JSON file at build time.
const modules = import.meta.glob('../../content/topics/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>

export const TOPICS: Topic[] = Object.values(modules)
  .flatMap((m) => (Array.isArray(m.default) ? m.default : [m.default]))
  .filter(isTopic)

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id)
}
