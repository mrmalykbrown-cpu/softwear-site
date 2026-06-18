"use client"

import { useEffect, useRef, useState } from "react"
import { CoverArt } from "@/components/cover-art"
import type { CoverSpec } from "@/lib/cover"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface Source {
  spec?: CoverSpec
  image?: string
}

interface Layer extends Source {
  key: number
}

let counter = 0

/**
 * Full-screen wallpaper that crossfades between covers.
 *
 * Accepts either a mesh-gradient `spec` (demo) or an `image` data-URI (real
 * album art on device). A new layer fades in over the previous one — gentle
 * opacity + slight scale + slight blur with a soft ease, so track changes
 * blend smoothly instead of snapping. Old layers are pruned after the blend.
 */
export function Wallpaper({
  id,
  spec,
  image,
  className = "",
}: {
  id: string
  spec?: CoverSpec
  image?: string
  className?: string
}) {
  const reduced = useReducedMotion()
  const [layers, setLayers] = useState<Layer[]>([{ key: counter++, spec, image }])
  const lastId = useRef(id)

  useEffect(() => {
    if (id === lastId.current) return
    lastId.current = id
    setLayers((prev) => [...prev, { key: counter++, spec, image }])
    const t = setTimeout(() => setLayers((prev) => prev.slice(-1)), reduced ? 90 : 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {layers.map((layer, i) => (
        <WallpaperLayer
          key={layer.key}
          spec={layer.spec}
          image={layer.image}
          fadeIn={i === layers.length - 1 && layers.length > 1}
          reduced={reduced}
        />
      ))}
    </div>
  )
}

function WallpaperLayer({
  spec,
  image,
  fadeIn,
  reduced,
}: Source & { fadeIn: boolean; reduced: boolean }) {
  const [shown, setShown] = useState(!fadeIn)

  useEffect(() => {
    if (!fadeIn) return
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [fadeIn])

  const style = {
    opacity: shown ? 1 : 0,
    transform: reduced ? undefined : shown ? "scale(1)" : "scale(1.04)",
    filter: reduced ? undefined : shown ? "blur(0px)" : "blur(8px)",
    transition: reduced
      ? "opacity 140ms linear"
      : "opacity 1100ms ease, transform 1500ms cubic-bezier(0.22,1,0.36,1), filter 1100ms ease",
    willChange: "opacity, transform",
  } as const

  if (image) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 h-full w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${image})`, ...style }}
      />
    )
  }

  return (
    <CoverArt
      spec={spec!}
      className="absolute inset-0 h-full w-full"
      style={style}
    />
  )
}
