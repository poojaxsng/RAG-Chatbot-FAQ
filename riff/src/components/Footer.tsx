import { useRiffStore } from '../store/riffStore'

export function Footer() {
  const setAboutOpen = useRiffStore((s) => s.setAboutOpen)
  return (
    <footer className="mt-10 border-t border-line pt-5 text-center text-xs leading-relaxed text-zinc-600">
      <p>
        Riff shares general climate and environment information for learning only. It is{' '}
        <strong>not professional advice</strong> and is not peer-reviewed. Facts and policy change — always
        verify with an authoritative source.
      </p>
      <button
        type="button"
        onClick={() => setAboutOpen(true)}
        className="mt-2 text-zinc-400 underline decoration-zinc-700 underline-offset-4 hover:text-brand"
      >
        How Riff works
      </button>
    </footer>
  )
}
