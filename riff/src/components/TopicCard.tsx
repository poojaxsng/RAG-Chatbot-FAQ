import type { ReactNode } from 'react'
import type { Topic } from '../types'
import { categoryByLabel } from '../content/categories'
import { IconSparkle } from './icons'

const MODE_LABEL: Record<Topic['mode'], string> = {
  'off-the-cuff': 'Off the cuff',
  'deep-research': 'Deep research',
}

const DIFFICULTY_LABEL: Record<Topic['difficulty'], string> = {
  everyday: 'Everyday',
  mixed: 'Mixed',
  technical: 'Technical',
}

export function TopicCard({ topic, children }: { topic: Topic; children?: ReactNode }) {
  const cat = categoryByLabel(topic.category)
  return (
    <section className="rounded-3xl border border-line bg-panel p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-brand/15 px-3 py-1 font-medium text-brand">{topic.category}</span>
        <span className="rounded-full border border-line px-3 py-1 text-zinc-400">
          {MODE_LABEL[topic.mode]}
        </span>
        <span className="rounded-full border border-line px-3 py-1 text-zinc-400">
          {DIFFICULTY_LABEL[topic.difficulty]}
        </span>
      </div>

      {cat && <p className="mt-3 text-sm text-zinc-500">{cat.blurb}</p>}

      <p className="mt-5 font-display text-2xl font-semibold leading-snug text-white sm:text-3xl">
        {topic.prompt}
      </p>

      {topic.hook && (
        <p className="mt-4 flex items-start gap-2 text-sm text-zinc-400">
          <IconSparkle className="mt-0.5 shrink-0 text-brand" />
          <span>{topic.hook}</span>
        </p>
      )}

      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}
