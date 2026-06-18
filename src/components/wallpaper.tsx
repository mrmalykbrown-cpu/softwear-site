"use client"

import { useEffect, useRef, useState } from "react"
import { CoverArt } from "@/components/cover-art"
import type { CoverSpec } from "@/lib/cover"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface Layer {
  key: number
  spec: CoverSpec
}

let counter = 0

/**
 * Full-bleed wallpaper that crossfades between covers.
 *
 * When `id` changes a new layer is stacked on top and fades in (opacity +
 * scale + blur, ease-out per the design system). The old layer stays opaque
 * underneath so there is never a flash, then is pruned once the transition
 * settles. Reduced-motion users get an instant, blur-free swap.
 */
export function Wallpaper({
  id,
  spec,
  className = "",
}: {
  id: string
  spec: CoverSpec
  className?: string
}) {
  const reduced = useReducedMotion()
  const [layers, setLayers] = useState<Layer[]>([{ key: counter++, spec }])
  const lastId = useRef(id)

  useEffect(() => {
    if (id === lastId.current) return
    lastId.current = id
    setLayers((prev) => [...prev, { key: counter++, spec }])
    const t = setTimeout(() => setLayers((prev) => prev.slice(-1)), reduced ? 80 : 950)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {layers.map((layer, i) => (
        <WallpaperLayer
          key={layer.key}
          spec={layer.spec}
          fadeIn={i === layers.length - 1 && layers.length > 1}
          reduced={reduced}
        />
      ))}
    </div>
  )
}

function WallpaperLayer({
  spec,
  fadeIn,
  reduced,
}: {
  spec: CoverSpec
  fadeIn: boolean
  reduced: boolean
}) {
  const [shown, setShown] = useState(!fadeIn)

  useEffect(() => {
    if (!fadeIn) return
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [fadeIn])

  return (
    <CoverArt
      spec={spec}
      className="absolute inset-0 h-full w-full will-change-[opacity,transform]"
      style={{
        opacity: shown ? 1 : 0,
        transform: reduced ? undefined : shown ? "scale(1)" : "scale(1.08)",
        filter: reduced ? undefined : shown ? "blur(0px)" : "blur(12px)",
        transition: reduced
          ? "opacity 120ms linear"
          : "opacity 900ms ease-out, transform 900ms ease-out, filter 900ms ease-out",
      }}
    />
  )
}
