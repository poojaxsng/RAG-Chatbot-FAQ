import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { IconClose } from './icons'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Sheet({ title, onClose, children }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-panel p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-panel-soft hover:text-white"
          >
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
