export type Mode = 'off-the-cuff' | 'deep-research'
export type Difficulty = 'everyday' | 'mixed' | 'technical'

/** Practice flow state machine. */
export type Phase = 'idle' | 'prep' | 'research' | 'research-done' | 'speak' | 'done' | 'revealed'

export interface SourceRef {
  title: string
  url: string
}

/** An authoritative report, agreement, standard, or body behind a card. */
export interface FrameworkRef {
  name: string
  detail: string
  gloss: string
}

export interface KnowCard {
  oneLiner: string
  keyPoints: string[]
  framework: FrameworkRef[]
  whatYouCanDo: string[]
  caveats: string
  sources: SourceRef[]
  /** ISO date the card content was last verified. */
  asOf: string
}

export interface Topic {
  id: string
  category: string
  mode: Mode
  difficulty: Difficulty
  prompt: string
  hook?: string
  card: KnowCard
}

export interface Category {
  id: string
  label: string
  everyday: boolean
  blurb: string
}

export interface Settings {
  /** Default mode on first load. */
  mode: Mode
  /** 0 = off, else 15..300 seconds. */
  prepSeconds: number
  /** 60..600 seconds. */
  speakSeconds: number
  /** 60..3600 seconds. */
  researchSeconds: number
  sound: boolean
  category: string
  recordByDefault: boolean
}

export interface SessionLog {
  id: string
  topicId: string
  category: string
  mode: Mode
  speakSeconds: number
  completedAt: string
}
