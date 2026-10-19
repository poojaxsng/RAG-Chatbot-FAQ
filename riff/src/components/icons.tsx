import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconSpin = (p: IconProps) => (
  <Base {...p}>
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="M4 4l5 5" />
  </Base>
)

export const IconSkip = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 4l10 8-10 8V4z" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </Base>
)

export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 4l14 8-14 8V4z" />
  </Base>
)

export const IconPause = (p: IconProps) => (
  <Base {...p}>
    <line x1="8" y1="5" x2="8" y2="19" />
    <line x1="16" y1="5" x2="16" y2="19" />
  </Base>
)

export const IconRestart = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Base>
)

export const IconEye = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
)

export const IconMic = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="17" x2="12" y2="22" />
  </Base>
)

export const IconStop = (p: IconProps) => (
  <Base {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Base>
)

export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 21h14" />
  </Base>
)

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </Base>
)

export const IconInfo = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <circle cx="12" cy="8" r="0.5" />
  </Base>
)

export const IconGear = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
  </Base>
)

export const IconChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 5 7 7-7 7" />
  </Base>
)

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 13l4 4L19 7" />
  </Base>
)

export const IconAlert = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 2 20h20L12 3z" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <circle cx="12" cy="17" r="0.5" />
  </Base>
)

export const IconExternal = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
  </Base>
)

export const IconList = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="3.5" cy="6" r="1" />
    <circle cx="3.5" cy="12" r="1" />
    <circle cx="3.5" cy="18" r="1" />
  </Base>
)

export const IconBook = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z" />
    <path d="M4 19a2 2 0 0 0 2 2h12" />
  </Base>
)

export const IconSteps = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4v6a3 3 0 0 0 3 3h0" />
    <path d="M10 13v5a2 2 0 0 0 2 2h0" />
    <path d="M17 4v10" />
    <path d="M17 20h.01" />
  </Base>
)

export const IconSparkle = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8c0 2.2 1.8 4 4 4-2.2 0-4 1.8-4 4 0-2.2-1.8-4-4-4 2.2 0 4-1.8 4-4z" />
  </Base>
)
