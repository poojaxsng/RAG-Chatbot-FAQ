import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORY_LABELS } from '../src/content/categories.ts'

const TOPICS_DIR = join(process.cwd(), 'content', 'topics')
const VALID_MODES = new Set(['off-the-cuff', 'deep-research'])
const VALID_DIFFICULTY = new Set(['everyday', 'mixed', 'technical'])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

interface Issue {
  file: string
  id: string
  message: string
}

const issues: Issue[] = []
const ids = new Map<string, string>()
const perCategory = new Map<string, number>()
let topicCount = 0

function checkString(file: string, id: string, value: unknown, field: string, issues: Issue[]): void {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push({ file, id, message: `missing or empty "${field}"` })
  }
}

function checkStringArray(file: string, id: string, value: unknown, field: string, issues: Issue[]): void {
  if (!Array.isArray(value) || value.length === 0 || !value.every((v) => typeof v === 'string' && v.trim())) {
    issues.push({ file, id, message: `"${field}" must be a non-empty array of strings` })
  }
}

function validateTopic(file: string, topic: Record<string, unknown>): void {
  const id = typeof topic.id === 'string' ? topic.id : '(no id)'

  checkString(file, id, topic.id, 'id', issues)
  checkString(file, id, topic.prompt, 'prompt', issues)

  if (typeof topic.category !== 'string' || !CATEGORY_LABELS.includes(topic.category)) {
    issues.push({ file, id, message: `unknown category "${String(topic.category)}"` })
  } else {
    perCategory.set(topic.category, (perCategory.get(topic.category) ?? 0) + 1)
  }

  if (typeof topic.mode !== 'string' || !VALID_MODES.has(topic.mode)) {
    issues.push({ file, id, message: `invalid mode "${String(topic.mode)}"` })
  }
  if (typeof topic.difficulty !== 'string' || !VALID_DIFFICULTY.has(topic.difficulty)) {
    issues.push({ file, id, message: `invalid difficulty "${String(topic.difficulty)}"` })
  }

  const card = topic.card as Record<string, unknown> | undefined
  if (!card || typeof card !== 'object') {
    issues.push({ file, id, message: 'missing "card"' })
    return
  }

  checkString(file, id, card.oneLiner, 'card.oneLiner', issues)
  checkString(file, id, card.caveats, 'card.caveats', issues)
  checkStringArray(file, id, card.keyPoints, 'card.keyPoints', issues)
  checkStringArray(file, id, card.whatYouCanDo, 'card.whatYouCanDo', issues)

  if (typeof card.asOf !== 'string' || !ISO_DATE.test(card.asOf)) {
    issues.push({ file, id, message: '"card.asOf" must be an ISO date (YYYY-MM-DD)' })
  }

  if (!Array.isArray(card.framework) || card.framework.length === 0) {
    issues.push({ file, id, message: '"card.framework" must list at least one reference' })
  } else {
    card.framework.forEach((ref, i) => {
      const r = ref as Record<string, unknown>
      if (!r || typeof r !== 'object') {
        issues.push({ file, id, message: `card.framework[${i}] is not an object` })
        return
      }
      checkString(file, id, r.name, `card.framework[${i}].name`, issues)
      checkString(file, id, r.detail, `card.framework[${i}].detail`, issues)
      checkString(file, id, r.gloss, `card.framework[${i}].gloss`, issues)
    })
  }

  if (!Array.isArray(card.sources) || card.sources.length === 0) {
    issues.push({ file, id, message: '"card.sources" must have at least one authoritative source' })
  } else {
    card.sources.forEach((src, i) => {
      const s = src as Record<string, unknown>
      if (!s || typeof s !== 'object') {
        issues.push({ file, id, message: `card.sources[${i}] is not an object` })
        return
      }
      checkString(file, id, s.title, `card.sources[${i}].title`, issues)
      if (typeof s.url !== 'string' || !/^https?:\/\//.test(s.url)) {
        issues.push({ file, id, message: `card.sources[${i}].url must be http(s)` })
      }
    })
  }

  if (typeof id === 'string' && ids.has(id)) {
    issues.push({ file, id, message: `duplicate id (also in ${ids.get(id)})` })
  } else if (typeof id === 'string') {
    ids.set(id, file)
  }
}

function main(): void {
  let files: string[] = []
  try {
    files = readdirSync(TOPICS_DIR).filter((f) => f.endsWith('.json'))
  } catch {
    console.error(`Could not read ${TOPICS_DIR}`)
    process.exit(1)
  }

  for (const file of files) {
    const raw = readFileSync(join(TOPICS_DIR, file), 'utf8')
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      issues.push({ file, id: '(file)', message: `invalid JSON: ${(err as Error).message}` })
      continue
    }
    const topics = Array.isArray(parsed) ? parsed : [parsed]
    topics.forEach((t) => {
      topicCount += 1
      validateTopic(file, t as Record<string, unknown>)
    })
  }

  console.log(`Checked ${topicCount} topics across ${files.length} files.`)
  console.log('Topics per category:')
  for (const label of CATEGORY_LABELS) {
    console.log(`  - ${label}: ${perCategory.get(label) ?? 0}`)
  }

  if (issues.length > 0) {
    console.error(`\n${issues.length} problem(s):`)
    for (const issue of issues) {
      console.error(`  ${issue.file} [${issue.id}] ${issue.message}`)
    }
    process.exit(1)
  }

  console.log('\nAll content valid.')
}

main()
