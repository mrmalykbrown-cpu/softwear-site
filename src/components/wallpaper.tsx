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
 * Full-screen wallpaper with a blended cross-dissolve.
 *
 * Old and new covers occupy the exact same space and melt into each other —
 * the incoming art fades up while easing down from a slight over-scale with a
 * brief blur bloom; the outgoing art fades out while drifting up in scale and
 * softening. No sliding panels: the two images genuinely blend in place.
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
    const t = setTimeout(() => setLayers((prev) => prev.slice(-1)), reduced ? 120 : 1050)
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
    const r = requestAnimationFrame(() => setArmed(true))
    return () => cancelAnimationFrame(r)
  }, [isEnter])

  const REST = {
    opacity: 1,
    transform: "scale(1)",
    filter: "blur(0px) saturate(1) brightness(1)",
  }
  const ENTER_FROM = {
    opacity: 0,
    transform: "scale(1.07)",
    filter: "blur(10px) saturate(1.35) brightness(1.08)",
  }
  const LEAVE_TO = {
    opacity: 0,
    transform: "scale(1.05)",
    filter: "blur(6px) saturate(1) brightness(0.9)",
  }

  let s: { opacity: number; transform?: string; filter?: string }
  if (reduced) {
    s = { opacity: state === "leave" ? 0 : isEnter && !armed ? 0 : 1 }
  } else if (isEnter) {
    s = armed ? REST : ENTER_FROM
  } else if (state === "leave") {
    s = LEAVE_TO
  } else {
    s = REST
  }

  const transition = reduced
    ? "opacity 200ms linear"
    : "opacity 900ms cubic-bezier(0.4,0,0.2,1), transform 1000ms cubic-bezier(0.22,1,0.36,1), filter 900ms ease"

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
