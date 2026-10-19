import type { ReactNode } from 'react'
import { useRiffStore } from '../store/riffStore'
import { CATEGORIES, ALL_CATEGORIES } from '../content/categories'
import { formatDuration } from '../lib/format'
import { currentStreak, totalReps } from '../lib/stats'
import { Sheet } from './Sheet'

const PREP_OPTIONS = [0, 15, 30, 45, 60, 90, 120, 180, 300]
const SPEAK_OPTIONS = [60, 90, 120, 180, 240, 300, 360, 420, 480, 540, 600]
const RESEARCH_OPTIONS = [60, 120, 300, 600, 900, 1200, 1800, 2700, 3600]

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-brand' : 'bg-panel-soft border border-line'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

const selectClass =
  'rounded-lg border border-line bg-panel-soft px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand'

export function SettingsSheet() {
  const open = useRiffStore((s) => s.settingsOpen)
  const setSettingsOpen = useRiffStore((s) => s.setSettingsOpen)
  const settings = useRiffStore((s) => s.settings)
  const log = useRiffStore((s) => s.log)
  const updateSettings = useRiffStore((s) => s.updateSettings)
  const setCategory = useRiffStore((s) => s.setCategory)
  const resetAllData = useRiffStore((s) => s.resetAllData)

  if (!open) return null

  return (
    <Sheet title="Settings" onClose={() => setSettingsOpen(false)}>
      <div className="divide-y divide-line">
        <Row label="Category" hint="Filter the deck or draw from everything.">
          <select
            className={selectClass}
            value={settings.category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value={ALL_CATEGORIES}>All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Off-the-cuff prep" hint="Quiet time before you speak.">
          <select
            className={selectClass}
            value={settings.prepSeconds}
            onChange={(e) => updateSettings({ prepSeconds: Number(e.target.value) })}
          >
            {PREP_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 0 ? 'Off' : formatDuration(s)}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Speaking time">
          <select
            className={selectClass}
            value={settings.speakSeconds}
            onChange={(e) => updateSettings({ speakSeconds: Number(e.target.value) })}
          >
            {SPEAK_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatDuration(s)}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Research time" hint="Used in Deep research mode.">
          <select
            className={selectClass}
            value={settings.researchSeconds}
            onChange={(e) => updateSettings({ researchSeconds: Number(e.target.value) })}
          >
            {RESEARCH_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatDuration(s)}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Sound cues" hint="Beeps at the start, 10s, and end.">
          <Toggle
            label="Sound cues"
            checked={settings.sound}
            onChange={(v) => updateSettings({ sound: v })}
          />
        </Row>

        <Row label="Auto-record" hint="Start recording automatically when you speak.">
          <Toggle
            label="Auto-record"
            checked={settings.recordByDefault}
            onChange={(v) => updateSettings({ recordByDefault: v })}
          />
        </Row>
      </div>

      <div className="mt-6 rounded-2xl bg-panel-soft p-4">
        <div className="flex justify-between text-sm text-zinc-300">
          <span>Reps completed</span>
          <span className="font-medium text-white">{totalReps(log)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-zinc-300">
          <span>Current streak</span>
          <span className="font-medium text-white">
            {currentStreak(log)} {currentStreak(log) === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={resetAllData}
        className="mt-6 w-full rounded-full border border-red-500/40 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
      >
        Clear local data
      </button>
      <p className="mt-3 text-center text-xs text-zinc-600">
        Settings and history live only in this browser.
      </p>
    </Sheet>
  )
}
