import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Mode, Phase, SessionLog, Settings, Topic } from '../types'
import { TOPICS, topicById } from '../content/loadTopics'
import { ALL_CATEGORIES, defaultModeForCategory } from '../content/categories'
import { drawNext } from '../lib/deck'

export const DEFAULT_SETTINGS: Settings = {
  mode: 'off-the-cuff',
  prepSeconds: 0,
  speakSeconds: 120,
  researchSeconds: 600,
  sound: true,
  category: ALL_CATEGORIES,
  recordByDefault: false,
}

interface RiffState {
  settings: Settings
  phase: Phase
  currentId: string | null
  deck: string[]
  ignored: string[]
  log: SessionLog[]
  aboutOpen: boolean
  settingsOpen: boolean
  toast: string | null

  updateSettings: (patch: Partial<Settings>) => void
  setMode: (mode: Mode) => void
  setCategory: (category: string) => void
  spin: () => void
  skip: () => void
  startSession: () => void
  startPrep: () => void
  startResearch: () => void
  startSpeaking: () => void
  onPrepComplete: () => void
  onResearchComplete: () => void
  onSpeakComplete: () => void
  reveal: () => void
  resetRound: () => void
  setAboutOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setToast: (message: string | null) => void
  resetAllData: () => void
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useRiffStore = create<RiffState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      phase: 'idle',
      currentId: null,
      deck: [],
      ignored: [],
      log: [],
      aboutOpen: false,
      settingsOpen: false,
      toast: null,

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setMode: (mode) =>
        set((s) => ({ settings: { ...s.settings, mode }, phase: 'idle' })),

      setCategory: (category) => {
        // Reset the round and let the category's default mode take over.
        const mode = category === ALL_CATEGORIES ? get().settings.mode : defaultModeForCategory(category)
        set((s) => ({
          settings: { ...s.settings, category, mode },
          phase: 'idle',
          currentId: null,
          deck: [],
        }))
      },

      spin: () => {
        const { deck, ignored, settings, currentId } = get()
        const { id, deck: rest } = drawNext(deck, TOPICS, settings.category, ignored, currentId)
        set({ currentId: id, deck: rest, phase: 'idle' })
      },

      skip: () => {
        const { currentId, ignored } = get()
        if (currentId) set({ ignored: [...ignored, currentId] })
        get().spin()
      },

      startSession: () => {
        const { settings, phase, currentId } = get()
        if (!currentId) {
          get().spin()
          return
        }
        if (phase !== 'idle') return
        if (settings.mode === 'deep-research') {
          set({ phase: 'research' })
        } else if (settings.prepSeconds > 0) {
          set({ phase: 'prep' })
        } else {
          set({ phase: 'speak' })
        }
      },

      startPrep: () => set({ phase: 'prep' }),
      startResearch: () => set({ phase: 'research' }),
      startSpeaking: () => set({ phase: 'speak' }),
      onPrepComplete: () => set({ phase: 'speak' }),
      onResearchComplete: () => set({ phase: 'research-done' }),

      onSpeakComplete: () => {
        const { currentId, settings, log } = get()
        const topic = currentId ? topicById(currentId) : undefined
        if (!topic) {
          set({ phase: 'done' })
          return
        }
        const entry: SessionLog = {
          id: newId(),
          topicId: topic.id,
          category: topic.category,
          mode: settings.mode,
          speakSeconds: settings.speakSeconds,
          completedAt: new Date().toISOString(),
        }
        set({ phase: 'done', log: [entry, ...log].slice(0, 500) })
      },

      reveal: () => set({ phase: 'revealed' }),

      resetRound: () => set({ phase: 'idle' }),

      setAboutOpen: (open) => set({ aboutOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setToast: (message) => set({ toast: message }),

      resetAllData: () =>
        set({
          settings: DEFAULT_SETTINGS,
          ignored: [],
          log: [],
          deck: [],
          currentId: null,
          phase: 'idle',
          toast: 'Local data cleared.',
        }),
    }),
    {
      name: 'riff-v2',
      partialize: (s) => ({
        settings: s.settings,
        ignored: s.ignored,
        log: s.log,
      }),
    },
  ),
)

/** Convenience selector for the topic currently on screen. */
export function useCurrentTopic(): Topic | undefined {
  const id = useRiffStore((s) => s.currentId)
  return id ? topicById(id) : undefined
}
