import { useRiffStore } from '../store/riffStore'
import { Sheet } from './Sheet'

export function AboutPanel() {
  const open = useRiffStore((s) => s.aboutOpen)
  const setAboutOpen = useRiffStore((s) => s.setAboutOpen)
  if (!open) return null

  return (
    <Sheet title="How Riff works" onClose={() => setAboutOpen(false)}>
      <div className="space-y-5 text-sm leading-relaxed text-zinc-300">
        <p>
          Riff is a practice tool for making sense of climate and the environment. You spin a random topic,
          explain it out loud, then reveal a <strong className="text-white">Know-this card</strong> so you
          actually understand the evidence behind it.
        </p>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-brand">Two modes</h3>
          <ul className="mt-2 space-y-2">
            <li>
              <strong className="text-white">Off the cuff</strong> — something you should already grasp.
              Little or no preparation; just talk it through.
            </li>
            <li>
              <strong className="text-white">Deep research</strong> — an unfamiliar topic. Riff gives you a
              research timer; you search on your own, then close your notes and speak.
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-brand">
            Why speak it aloud
          </h3>
          <p className="mt-2">
            You do not really understand a topic until you can explain it in plain language. Speaking exposes
            the gaps; the timer makes you recall instead of skim.
          </p>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-brand">
            Sources & method
          </h3>
          <p className="mt-2">
            Every card is written in plain language and cites authoritative sources such as the IPCC, UNFCCC,
            MoEFCC, CPCB and other official portals, with the date it was last verified. Riff does not browse
            or generate answers.
          </p>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-xs text-zinc-300">
          <p className="font-semibold text-red-300">Not professional advice</p>
          <p className="mt-1">
            Riff shares general climate and environment information for learning only. It is not professional
            or policy advice, and is written by the team without peer review. Facts, standards and policy
            change over time — always verify with an authoritative source.
          </p>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-brand">Privacy</h3>
          <p className="mt-2">
            No account, no tracking, no server. Your settings, history and any recording stay on your device.
          </p>
        </div>
      </div>
    </Sheet>
  )
}
