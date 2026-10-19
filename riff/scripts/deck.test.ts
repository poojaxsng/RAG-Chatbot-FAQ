import assert from 'node:assert/strict'
import { buildDeck, drawNext, eligibleTopics, shuffle } from '../src/lib/deck.ts'
import type { Topic } from '../src/types.ts'

/** Minimal topic factory for deck tests (deck logic only reads id + category). */
function t(id: string, category: string): Topic {
  return {
    id,
    category,
    mode: 'off-the-cuff',
    difficulty: 'everyday',
    prompt: 'p',
    card: {
      oneLiner: 'x',
      keyPoints: ['a'],
      framework: [{ name: 'n', detail: '1', gloss: 'g' }],
      whatYouCanDo: ['a'],
      caveats: 'c',
      sources: [{ title: 'i', url: 'https://example.com' }],
      asOf: '2026-01-01',
    },
  }
}

const topics: Topic[] = [
  t('a', 'Cat A'),
  t('b', 'Cat A'),
  t('c', 'Cat B'),
  t('d', 'Cat B'),
]

let passed = 0
function check(name: string, fn: () => void): void {
  fn()
  passed += 1
  console.log(`  ok - ${name}`)
}

// Deterministic rng for reproducibility.
function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

check('eligibleTopics filters by category', () => {
  assert.deepEqual(
    eligibleTopics(topics, 'Cat A').map((x) => x.id),
    ['a', 'b'],
  )
  assert.equal(eligibleTopics(topics, 'all').length, 4)
})

check('eligibleTopics of unknown category is empty', () => {
  assert.deepEqual(eligibleTopics(topics, 'Nope'), [])
})

check('buildDeck excludes ignored topics', () => {
  const deck = buildDeck(topics, 'all', ['a', 'c'], seeded(1))
  assert.equal(deck.length, 2)
  assert.ok(!deck.includes('a') && !deck.includes('c'))
})

check('buildDeck respects category filter', () => {
  const deck = buildDeck(topics, 'Cat A', [], seeded(2))
  assert.deepEqual([...deck].sort(), ['a', 'b'])
})

check('shuffle is a permutation and deterministic for a fixed rng', () => {
  const a = shuffle([1, 2, 3, 4, 5], seeded(42))
  const b = shuffle([1, 2, 3, 4, 5], seeded(42))
  assert.deepEqual(a, b)
  assert.deepEqual([...a].sort(), [1, 2, 3, 4, 5])
})

check('drawNext pops one and refills when the deck is empty', () => {
  const first = drawNext([], topics, 'all', [], null, seeded(3))
  assert.ok(first.id)
  assert.equal(first.deck.length, 3)

  const second = drawNext(first.deck, topics, 'all', [], first.id, seeded(4))
  assert.ok(second.id)
  assert.notEqual(second.id, first.id)
  assert.equal(second.deck.length, 2)
})

check('drawNext avoids the current topic when alternatives exist', () => {
  // Deck front is the current topic; drawer should swap it out.
  const deck = ['a', 'b', 'c']
  const { id } = drawNext(deck, topics, 'all', [], 'a', seeded(5))
  assert.notEqual(id, 'a')
})

check('drawNext returns null when nothing is eligible', () => {
  const { id, deck } = drawNext([], topics, 'all', ['a', 'b', 'c', 'd'], null, seeded(6))
  assert.equal(id, null)
  assert.deepEqual(deck, [])
})

console.log(`\n${passed} deck tests passed.`)
