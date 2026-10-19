import { useEffect } from 'react'
import type { Mode } from './types'
import { useCurrentTopic, useRiffStore } from './store/riffStore'
import { CATEGORIES, ALL_CATEGORIES } from './content/categories'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { TopicCard } from './components/TopicCard'
import { Timer } from './components/Timer'
import { KnowThisCard } from './components/KnowThisCard'
import { RecordBar } from './components/RecordBar'
import { SettingsSheet } from './components/SettingsSheet'
import { AboutPanel } from './components/AboutPanel'
import { IconChevronRight, IconEye, IconSkip, IconSpin } from './components/icons'

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'off-the-cuff', label: 'Off the cuff', hint: 'Talk it through now' },
  { id: 'deep-research', label: 'Deep research', hint: 'Research first, then speak' },
]

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-ink transition-colors hover:bg-brand-dark'
const ghostBtn =
  'inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-brand hover:text-white'

function ModeToggle() {
  const mode = useRiffStore((s) => s.settings.mode)
  const setMode = useRiffStore((s) => s.setMode)
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-panel-soft p-1">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          className={`rounded-xl px-4 py-2.5 text-left transition-colors ${
            mode === m.id ? 'bg-brand text-ink' : 'text-zinc-300 hover:bg-panel'
          }`}
        >
          <span className="block text-sm font-semibold">{m.label}</span>
          <span className={`block text-xs ${mode === m.id ? 'text-ink/70' : 'text-zinc-500'}`}>
            {m.hint}
          </span>
        </button>
      ))}
    </div>
  )
}

function CategoryQuickSelect() {
  const category = useRiffStore((s) => s.settings.category)
  const setCategory = useRiffStore((s) => s.setCategory)
  return (
    <select
      aria-label="Category"
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      className="w-full rounded-2xl border border-line bg-panel-soft px-4 py-3 text-sm text-zinc-100 outline-none focus:border-brand"
    >
      <option value={ALL_CATEGORIES}>All categories</option>
      {CATEGORIES.map((c) => (
        <option key={c.id} value={c.label}>
          {c.label}
        </option>
      ))}
    </select>
  )
}

function App() {
  const phase = useRiffStore((s) => s.phase)
  const settings = useRiffStore((s) => s.settings)
  const spin = useRiffStore((s) => s.spin)
  const skip = useRiffStore((s) => s.skip)
  const startSession = useRiffStore((s) => s.startSession)
  const startSpeaking = useRiffStore((s) => s.startSpeaking)
  const onPrepComplete = useRiffStore((s) => s.onPrepComplete)
  const onResearchComplete = useRiffStore((s) => s.onResearchComplete)
  const onSpeakComplete = useRiffStore((s) => s.onSpeakComplete)
  const reveal = useRiffStore((s) => s.reveal)
  const resetRound = useRiffStore((s) => s.resetRound)
  const toast = useRiffStore((s) => s.toast)
  const setToast = useRiffStore((s) => s.setToast)

  const topic = useCurrentTopic()

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(id)
  }, [toast, setToast])

  const startLabel =
    settings.mode === 'deep-research'
      ? 'Start research'
      : settings.prepSeconds > 0
        ? 'Start prep'
        : 'Start speaking'

  function renderStage() {
    if (!topic) return null
    switch (phase) {
      case 'idle':
        return (
          <div className="space-y-4">
            <ModeToggle />
            <div className="flex flex-wrap gap-3">
              <button type="button" className={primaryBtn} onClick={startSession}>
                {startLabel}
                <IconChevronRight />
              </button>
              <button type="button" className={ghostBtn} onClick={spin}>
                <IconSpin /> New topic
              </button>
              <button type="button" className={ghostBtn} onClick={skip}>
                <IconSkip /> Skip
              </button>
            </div>
          </div>
        )
      case 'prep':
        return (
          <Timer
            key="prep"
            seconds={settings.prepSeconds}
            label="Prep"
            hint="Collect your thoughts. Speaking starts automatically."
            sound={settings.sound}
            onComplete={onPrepComplete}
          />
        )
      case 'research':
        return (
          <Timer
            key="research"
            seconds={settings.researchSeconds}
            label="Research"
            hint="Search authoritative sources yourself. Close your notes when the timer ends."
            sound={settings.sound}
            onComplete={onResearchComplete}
          />
        )
      case 'research-done':
        return (
          <div className="space-y-4 text-center">
            <p className="text-sm text-zinc-400">
              Research done. Close your notes and explain the topic from memory.
            </p>
            <button type="button" className={primaryBtn} onClick={startSpeaking}>
              Start speaking
              <IconChevronRight />
            </button>
          </div>
        )
      case 'speak':
        return (
          <div className="space-y-5">
            <Timer
              key="speak"
              seconds={settings.speakSeconds}
              label="Speak"
              hint="Explain the topic in your own words."
              sound={settings.sound}
              onComplete={onSpeakComplete}
            />
            <RecordBar active recordByDefault={settings.recordByDefault} />
          </div>
        )
      case 'done':
        return (
          <div className="space-y-4 text-center">
            <p className="text-sm text-zinc-400">Nice rep. Want to see what the science and policy say?</p>
            <button type="button" className={primaryBtn} onClick={reveal}>
              <IconEye />
              Reveal the card
            </button>
          </div>
        )
      case 'revealed':
        return null
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:py-10">
      <Header />

      <main className="mt-8 flex-1">
        {!topic ? (
          <section className="rounded-3xl border border-line bg-panel p-8 text-center sm:p-12">
            <p className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Make sense of climate, one rep at a time.
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm text-zinc-400">
              Spin a climate or environment topic, explain it out loud, then reveal what the evidence actually
              says. Educational only — not professional advice.
            </p>
            <button type="button" className={`${primaryBtn} mt-8`} onClick={spin}>
              <IconSpin />
              Spin a topic
            </button>
          </section>
        ) : (
          <div className="space-y-6">
            <TopicCard topic={topic}>{renderStage()}</TopicCard>

            {phase === 'idle' && <CategoryQuickSelect />}

            {phase === 'revealed' && <KnowThisCard topic={topic} />}

            {phase === 'revealed' && (
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" className={primaryBtn} onClick={spin}>
                  Next topic
                  <IconChevronRight />
                </button>
                <button type="button" className={ghostBtn} onClick={resetRound}>
                  <IconEye /> Re-read prompt
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      <SettingsSheet />
      <AboutPanel />

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-panel px-4 py-2 text-sm text-zinc-200 shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
