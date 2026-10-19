import type { ReactNode } from 'react'
import type { Topic } from '../types'
import { formatDate } from '../lib/format'
import { IconAlert, IconBook, IconExternal, IconList, IconSparkle, IconSteps } from './icons'

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-brand">
        {icon}
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  )
}

export function KnowThisCard({ topic }: { topic: Topic }) {
  const { card } = topic
  return (
    <section className="rounded-3xl border border-brand/40 bg-panel p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">
          Know this
        </span>
        <span className="text-xs text-zinc-500">Verified {formatDate(card.asOf)}</span>
      </div>

      <p className="mt-4 font-display text-xl font-semibold leading-snug text-white sm:text-2xl">
        {card.oneLiner}
      </p>

      <div className="mt-6 space-y-6">
        <Section icon={<IconSparkle />} title="Key points">
          <ul className="space-y-2">
            {card.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-200">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<IconBook />} title="Science & policy">
          <ul className="space-y-3">
            {card.framework.map((ref, i) => (
              <li key={i} className="rounded-xl bg-panel-soft p-3">
                <p className="text-sm font-medium text-white">
                  {ref.name} <span className="text-brand">{ref.detail}</span>
                </p>
                <p className="mt-1 text-sm text-zinc-400">{ref.gloss}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<IconSteps />} title="What you can do">
          <ol className="space-y-2">
            {card.whatYouCanDo.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-zinc-200">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel-soft text-xs text-brand">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section icon={<IconAlert />} title="Caveats">
          <p className="text-sm text-zinc-400">{card.caveats}</p>
        </Section>

        <Section icon={<IconList />} title="Sources">
          <ul className="space-y-2">
            {card.sources.map((source, i) => (
              <li key={i}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
                >
                  <IconExternal className="text-xs" />
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </section>
  )
}
