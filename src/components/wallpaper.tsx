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

type LayerState = "enter" | "leave" | "static"

let counter = 0

/**
 * Full-screen wallpaper transition.
 *
 * The KEY rule: the outgoing cover stays fully opaque underneath the whole
 * time, so the page background is never visible — no black-out flash, ever.
 * The incoming cover blooms in on top via an expanding circular reveal with a
 * zoom-down and blur-to-sharp, so the change is vivid rather than a flat fade.
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
    // prune only AFTER the incoming layer fully covers the old one
    const t = setTimeout(() => setLayers((prev) => prev.slice(-1)), reduced ? 260 : 1150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const last = layers.length - 1
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {layers.map((layer, i) => {
        const state: LayerState =
          layers.length > 1 && i === last
            ? "enter"
            : layers.length > 1 && i === last - 1
              ? "leave"
              : "static"
        return (
          <WallpaperLayer
            key={layer.key}
            spec={layer.spec}
            image={layer.image}
            state={state}
            reduced={reduced}
          />
        )
      })}
    </div>
  )
}

function WallpaperLayer({
  spec,
  image,
  state,
  reduced,
}: Source & { state: LayerState; reduced: boolean }) {
  const isEnter = state === "enter"
  const [armed, setArmed] = useState(!isEnter)

  useEffect(() => {
    if (!isEnter) return
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)))
    return () => cancelAnimationFrame(r)
  }, [isEnter])

  const REST = {
    opacity: 1,
    transform: "scale(1)",
    filter: "blur(0px) saturate(1) brightness(1)",
    clipPath: "circle(150% at 50% 52%)",
  }
  // incoming starts as a tiny, bright, zoomed, blurred seed and blooms outward
  const ENTER_FROM = {
    opacity: 1,
    transform: "scale(1.18)",
    filter: "blur(16px) saturate(1.5) brightness(1.18)",
    clipPath: "circle(0% at 50% 52%)",
  }
  // outgoing stays fully opaque (no black-out), just drifts back in scale
  const LEAVE_TO = {
    opacity: 1,
    transform: "scale(1.07)",
    filter: "blur(2px) saturate(1) brightness(0.92)",
    clipPath: "circle(150% at 50% 52%)",
  }

  let s: typeof REST
  if (reduced) {
    // simple opaque swap: old stays, new fades in quickly on top (still no black)
    s = isEnter
      ? { ...REST, opacity: armed ? 1 : 0 }
      : REST
  } else if (isEnter) {
    s = armed ? REST : ENTER_FROM
  } else if (state === "leave") {
    s = LEAVE_TO
  } else {
    s = REST
  }

  const transition = reduced
    ? "opacity 260ms ease"
    : "transform 1100ms cubic-bezier(0.22,1,0.36,1), filter 850ms ease, clip-path 950ms cubic-bezier(0.22,1,0.36,1)"

  const style = { ...s, transition, willChange: "transform, clip-path, filter" } as const

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
    <CoverArt spec={spec!} className="absolute inset-0 h-full w-full" style={style} />
  )
}
