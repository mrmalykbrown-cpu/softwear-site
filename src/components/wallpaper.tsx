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
 * Full-screen wallpaper with a lively directional transition.
 *
 * The incoming cover slides in from the side you're heading (right for next,
 * left for previous), zooming down from a slight over-scale with a quick blur
 * bloom and a saturation/brightness pop. The outgoing cover drifts the other
 * way, scales up and dims — a parallax cross-dissolve that feels energetic but
 * still smooth. Reduced-motion users get a plain quick fade.
 */
export function Wallpaper({
  id,
  spec,
  image,
  direction = 1,
  className = "",
}: {
  id: string
  spec?: CoverSpec
  image?: string
  /** 1 = next (slide from right), -1 = previous (slide from left) */
  direction?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const [layers, setLayers] = useState<Layer[]>([{ key: counter++, spec, image }])
  const lastId = useRef(id)

  useEffect(() => {
    if (id === lastId.current) return
    lastId.current = id
    setLayers((prev) => [...prev, { key: counter++, spec, image }])
    const t = setTimeout(() => setLayers((prev) => prev.slice(-1)), reduced ? 110 : 1050)
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
            dir={direction >= 0 ? 1 : -1}
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
  dir,
  reduced,
}: Source & { state: LayerState; dir: number; reduced: boolean }) {
  const isEnter = state === "enter"
  const [armed, setArmed] = useState(!isEnter)

  useEffect(() => {
    if (!isEnter) return
    const r = requestAnimationFrame(() => setArmed(true))
    return () => cancelAnimationFrame(r)
  }, [isEnter])

  const REST = {
    opacity: 1,
    transform: "translateX(0%) scale(1)",
    filter: "blur(0px) saturate(1) brightness(1)",
  }
  const OFFSCREEN = {
    opacity: 0,
    transform: `translateX(${dir * 14}%) scale(1.14)`,
    filter: "blur(12px) saturate(1.55) brightness(1.12)",
  }
  const DRIFTED = {
    opacity: 1,
    transform: `translateX(${-dir * 7}%) scale(1.08)`,
    filter: "blur(3px) saturate(0.95) brightness(0.78)",
  }

  let s: { opacity: number; transform?: string; filter?: string }
  if (reduced) {
    s = { opacity: isEnter && !armed ? 0 : 1 }
  } else if (isEnter) {
    s = armed ? REST : OFFSCREEN
  } else if (state === "leave") {
    s = DRIFTED
  } else {
    s = REST
  }

  const transition = reduced
    ? "opacity 180ms linear"
    : "opacity 650ms ease, transform 850ms cubic-bezier(0.16,1,0.3,1), filter 700ms ease"

  const style = { ...s, transition, willChange: "opacity, transform, filter" } as const

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
