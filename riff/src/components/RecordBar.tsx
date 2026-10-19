import { useCallback, useEffect, useRef, useState } from 'react'
import { canRecord, downloadBlob, extensionFor, pickMimeType } from '../lib/recorder'
import { formatClock } from '../lib/format'
import { IconDownload, IconMic, IconStop } from './icons'

interface RecordBarProps {
  active: boolean
  recordByDefault: boolean
}

export function RecordBar({ active, recordByDefault }: RecordBarProps) {
  const supported = canRecord()
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const mimeRef = useRef<string | undefined>(undefined)
  const timerRef = useRef<number | null>(null)
  const urlRef = useRef<string | null>(null)

  const start = useCallback(async () => {
    if (!canRecord() || recorderRef.current) return
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      mimeRef.current = pickMimeType()
      const rec = mimeRef.current
        ? new MediaRecorder(stream, { mimeType: mimeRef.current })
        : new MediaRecorder(stream)

      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const type = mimeRef.current ?? 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        blobRef.current = blob
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        setClipUrl(url)
        setRecording(false)
        setElapsed(0)
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        recorderRef.current = null
        if (timerRef.current) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      rec.start()
      recorderRef.current = rec
      setRecording(true)
      setElapsed(0)
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    } catch {
      setError('Microphone access was blocked.')
    }
  }, [])

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }, [])

  // Auto start/stop with the speaking phase.
  useEffect(() => {
    if (active && recordByDefault && supported && !recorderRef.current) void start()
    if (!active && recorderRef.current) stop()
    return undefined
  }, [active, recordByDefault, supported, start, stop])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  const handleDownload = () => {
    if (blobRef.current) {
      downloadBlob(blobRef.current, `riff-${Date.now()}.${extensionFor(mimeRef.current)}`)
    }
  }

  if (!supported) {
    return <p className="text-center text-xs text-zinc-500">Recording is not supported in this browser.</p>
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        {recording ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-full bg-red-500/90 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            <IconStop />
            Stop <span className="tabular-nums">{formatClock(elapsed)}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-soft px-5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-brand hover:text-white"
          >
            <IconMic />
            {clipUrl ? 'Record again' : 'Record yourself'}
          </button>
        )}

        {clipUrl && (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-soft px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-brand hover:text-white"
          >
            <IconDownload />
            Save
          </button>
        )}
      </div>

      {clipUrl && <audio controls src={clipUrl} className="w-full max-w-xs" />}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-center text-xs text-zinc-600">Stays on your device. Nothing is uploaded.</p>
    </div>
  )
}
