import type { Topic } from '../types'
import { ALL_CATEGORIES } from '../content/categories'

export type Rng = () => number

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(input: readonly T[], rng: Rng = Math.random): T[] {
  const arr = input.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Topics matching an active category filter ("all" = everything). */
export function eligibleTopics(all: readonly Topic[], category: string): Topic[] {
  if (category === ALL_CATEGORIES) return all.slice()
  return all.filter((t) => t.category === category)
}

/**
 * Build a fresh shuffled deck of topic ids for a category, excluding ignored
 * topics. Used when the deck runs out or the category changes.
 */
export function buildDeck(
  all: readonly Topic[],
  category: string,
  ignored: readonly string[] = [],
  rng: Rng = Math.random,
): string[] {
  const ids = eligibleTopics(all, category)
    .filter((t) => !ignored.includes(t.id))
    .map((t) => t.id)
  return shuffle(ids, rng)
}

/**
 * Pop the next topic id from the remaining deck, refilling from `all` when
 * empty. Never returns the id that is currently on screen (`avoidId`).
 */
export function drawNext(
  deck: readonly string[],
  all: readonly Topic[],
  category: string,
  ignored: readonly string[],
  avoidId: string | null,
  rng: Rng = Math.random,
): { id: string | null; deck: string[] } {
  let working = deck.slice()
  if (working.length === 0) {
    working = buildDeck(all, category, ignored, rng)
  }
  // Avoid immediately repeating the current topic when alternatives exist.
  if (working.length > 1 && avoidId && working[0] === avoidId) {
    ;[working[0], working[1]] = [working[1], working[0]]
  }
  const [id, ...rest] = working
  return { id: id ?? null, deck: rest }
}
