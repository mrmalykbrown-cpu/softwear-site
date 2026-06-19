"use client"

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react"
import { CoverArt } from "@/components/cover-art"
import type { CoverSpec } from "@/lib/cover"

/**
 * Living full-screen wallpaper.
 *
 * Transition rule: the outgoing cover stays fully opaque underneath (zIndex 1)
 * so the page background is never visible — no black-out. The incoming cover
 * (zIndex 2) springs in on top: scaling down from an over-zoom with a quick
 * blur-bloom and brightness pop, settling with real spring physics.
 *
 * Between changes the art is never static: it slowly breathes and drifts
 * (Ken Burns) while playing, with a soft specular light gliding across it.
 */
export function Wallpaper({
  id,
  spec,
  image,
  playing = true,
  dragX,
  className = "",
}: {
  id: string
  spec?: CoverSpec
  image?: string
  playing?: boolean
  dragX?: MotionValue<number>
  className?: string
}) {
  const reduce = useReducedMotion()
  const fallback = useMotionValue(0)
  const parallaxX = useTransform(dragX ?? fallback, (v) => v * 0.16)

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={id}
          className="absolute inset-0"
          style={{ willChange: "transform, opacity, filter" }}
          initial={
            reduce
              ? { opacity: 0, zIndex: 2 }
              : {
                  opacity: 0,
                  scale: 1.12,
                  filter: "blur(14px) saturate(1.5) brightness(1.16)",
                  zIndex: 2,
                }
          }
          animate={
            reduce
              ? { opacity: 1, zIndex: 2 }
              : {
                  opacity: 1,
                  scale: 1,
                  filter: "blur(0px) saturate(1) brightness(1)",
                  zIndex: 2,
                }
          }
          exit={
            reduce
              ? { opacity: 1, zIndex: 1, transition: { duration: 0.25 } }
              : {
                  opacity: 1,
                  scale: 1.05,
                  filter: "blur(2px) brightness(0.9)",
                  zIndex: 1,
                  transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
                }
          }
          transition={{
            opacity: { duration: reduce ? 0.3 : 0.55, ease: [0.33, 0, 0.2, 1] },
            scale: { type: "spring", stiffness: 110, damping: 20, mass: 1 },
            filter: { duration: 0.65, ease: "easeOut" },
          }}
        >
          <motion.div className="absolute inset-0" style={{ x: parallaxX }}>
            <BreathingArt spec={spec} image={image} playing={playing} reduce={!!reduce} />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function BreathingArt({
  spec,
  image,
  playing,
  reduce,
}: {
  spec?: CoverSpec
  image?: string
  playing: boolean
  reduce: boolean
}) {
  const alive = !reduce && playing
  return (
    <motion.div
      className="absolute inset-0"
      style={{ willChange: "transform" }}
      animate={alive ? { scale: [1, 1.05, 1], x: [0, -7, 0], y: [0, -5, 0] } : { scale: 1, x: 0, y: 0 }}
      transition={
        alive
          ? { duration: 18, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.8, ease: "easeOut" }
      }
    >
      {image ? (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})`, transform: "scale(1.08)" }}
        />
      ) : (
        <CoverArt
          spec={spec!}
          className="absolute inset-0"
          style={{ transform: "scale(1.08)" }}
        />
      )}

      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(45% 45% at 50% 45%, rgba(255,255,255,0.10), rgba(255,255,255,0) 70%)",
            mixBlendMode: "soft-light",
          }}
          animate={{ x: ["-28%", "30%", "-28%"], y: ["-12%", "14%", "-12%"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  )
}
