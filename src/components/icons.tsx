import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 4.5v15l13-7.5L6 4.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SkipBackIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6 9 12l9 6V6Z" fill="currentColor" stroke="none" />
      <rect x="5" y="5.5" width="2.2" height="13" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SkipForwardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l9 6-9 6V6Z" fill="currentColor" stroke="none" />
      <rect x="16.8" y="5.5" width="2.2" height="13" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

export function WallpaperIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <circle cx="9" cy="9" r="1.6" />
      <path d="m5 17 4-4 3 3 3-4 4 5" />
    </svg>
  )
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 13.7 9 19 10.7 13.7 12.4 12 18l-1.7-5.6L5 10.7 10.3 9 12 3.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12.5 5 5 9-11" />
    </svg>
  )
}

export function WifiIcon(props: IconProps) {
  return (
    <svg {...base} {...props} strokeWidth={2}>
      <path d="M2.5 8.5a16 16 0 0 1 19 0" />
      <path d="M5.5 12a11 11 0 0 1 13 0" />
      <path d="M8.5 15.5a6 6 0 0 1 7 0" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" />
    </svg>
  )
}
