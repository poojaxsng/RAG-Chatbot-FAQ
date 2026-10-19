export const RECORD_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

/** First MediaRecorder MIME type the browser supports, or undefined (browser default). */
export function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  for (const type of RECORD_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return undefined
}

export function canRecord(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function extensionFor(mime: string | undefined): string {
  if (!mime) return 'webm'
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}
