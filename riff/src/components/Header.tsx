import { useRiffStore } from '../store/riffStore'
import { IconGear, IconInfo } from './icons'

export function Header() {
  const setSettingsOpen = useRiffStore((s) => s.setSettingsOpen)
  const setAboutOpen = useRiffStore((s) => s.setAboutOpen)

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold tracking-tight text-white">riff</span>
        <span className="hidden text-sm text-zinc-500 sm:inline">climate &amp; environment</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          aria-label="About and methodology"
          className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-panel-soft hover:text-white"
        >
          <IconInfo />
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-panel-soft hover:text-white"
        >
          <IconGear />
        </button>
      </div>
    </header>
  )
}
