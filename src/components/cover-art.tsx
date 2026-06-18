import type { CSSProperties } from "react"
import { coverBackground, type CoverSpec } from "@/lib/cover"

interface CoverArtProps {
  spec: CoverSpec
  className?: string
  style?: CSSProperties
}

/** Renders a mesh-gradient cover from a spec. Pure / presentational. */
export function CoverArt({ spec, className = "", style }: CoverArtProps) {
  return (
    <div
      aria-hidden
      className={className}
      style={{ background: coverBackground(spec), ...style }}
    />
  )
}
