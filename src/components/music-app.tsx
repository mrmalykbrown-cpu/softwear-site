"use client"

import { useCallback, useEffect, useState } from "react"
import { PhoneFrame } from "@/components/phone-frame"
import { Wallpaper } from "@/components/wallpaper"
import { NowPlayingWidget } from "@/components/now-playing-widget"
import { TrackGallery } from "@/components/track-gallery"
import { WebGLShader } from "@/components/ui/web-gl-shader"
import { SparkleIcon, WifiIcon } from "@/components/icons"
import { tracks } from "@/lib/tracks"
import { coverGlow, downloadCover } from "@/lib/cover"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

export function MusicApp() {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [applied, setApplied] = useState(false)
  const [ambient, setAmbient] = useState(true)
  const [clock, setClock] = useState("9:41")

  const track = tracks[index]

  const goTo = useCallback((i: number) => {
    setIndex(((i % tracks.length) + tracks.length) % tracks.length)
    setProgress(0)
  }, [])

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  // live lock-screen clock (set after mount to avoid hydration mismatch)
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      )
    tick()
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [])

  // playback progress
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.5 / track.duration))
    }, 500)
    return () => clearInterval(id)
  }, [isPlaying, track.duration])

  // auto-advance at end of track
  useEffect(() => {
    if (progress < 1) return
    const t = setTimeout(next, 350)
    return () => clearTimeout(t)
  }, [progress, next])

  const setWallpaper = useCallback(async () => {
    setApplied(true)
    await downloadCover(track.cover, `${track.id}-wallpaper`)
    window.setTimeout(() => setApplied(false), 2600)
  }, [track])

  return (
    <main className="relative min-h-dvh w-full px-5 py-8 sm:px-8 lg:py-14">
      {/* static gradient backdrop (always present) */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 transition-[background] duration-1000"
        style={{
          background: `radial-gradient(1200px 700px at 15% -10%, ${coverGlow(
            track.cover
          )}33, transparent 60%), radial-gradient(900px 600px at 110% 110%, ${
            track.cover.to
          }44, transparent 55%), var(--background)`,
        }}
      />

      {/* animated WebGL ambience (opt-in, off for reduced motion) */}
      {ambient && !reduced && (
        <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.18] blur-3xl saturate-150">
          <WebGLShader />
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl">
        <Header ambient={ambient} reduced={reduced} onToggleAmbient={() => setAmbient((a) => !a)} />

        <div className="mt-10 grid items-start gap-12 lg:mt-14 lg:grid-cols-[330px_1fr]">
          {/* phone */}
          <div className="mx-auto lg:sticky lg:top-10">
            <div className={reduced ? "" : "animate-float"}>
              <PhoneFrame>
                <Wallpaper id={track.id} spec={track.cover} />

                {/* legibility scrim */}
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/35 via-transparent to-black/65" />

                {/* screen UI */}
                <div className="absolute inset-0 z-20 flex flex-col">
                  {/* status bar */}
                  <div className="flex items-center justify-between px-7 pt-3.5 text-[11px] font-semibold text-white">
                    <span className="tabular-nums">{clock}</span>
                    <span className="flex items-center gap-1.5">
                      <WifiIcon className="size-3.5" />
                      <Battery />
                    </span>
                  </div>

                  {/* lock-screen clock */}
                  <div className="mt-6 px-7 text-center text-white">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
                      {new Date().toLocaleDateString([], {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="mt-1 text-6xl font-light tabular-nums leading-none drop-shadow-lg">
                      {clock}
                    </p>
                  </div>

                  {/* widget */}
                  <div className="mt-auto px-3 pb-7">
                    <NowPlayingWidget
                      track={track}
                      isPlaying={isPlaying}
                      progress={progress}
                      applied={applied}
                      onToggle={() => setIsPlaying((p) => !p)}
                      onPrev={prev}
                      onNext={next}
                      onSetWallpaper={setWallpaper}
                    />
                  </div>
                </div>
              </PhoneFrame>
            </div>
          </div>

          {/* gallery / now playing */}
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex size-2 items-center justify-center">
                <span className="size-2 animate-ping rounded-full bg-[var(--play)]" />
              </span>
              Now playing
            </div>
            <h2 className="mt-1 font-display text-4xl text-white sm:text-5xl">
              {track.title}
            </h2>
            <p className="mt-1 text-lg text-muted-foreground">{track.artist}</p>

            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
              Pick any cover and watch it morph into the phone&apos;s wallpaper with a
              smooth crossfade. Drive playback from the liquid-glass widget, then hit{" "}
              <span className="font-medium text-white">Set as wallpaper</span> to export
              the artwork at full phone resolution.
            </p>

            <h3 className="mt-9 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Art library
            </h3>
            <div className="mt-3">
              <TrackGallery tracks={tracks} currentId={track.id} onSelect={goTo} />
            </div>
          </div>
        </div>
      </div>

      {/* toast */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        <div
          className={`rounded-full border border-white/15 bg-black/70 px-5 py-2.5 text-sm text-white shadow-2xl backdrop-blur-xl transition-all duration-300 ${
            applied
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          Wallpaper saved to your downloads — set it from Photos to apply on a device.
        </div>
      </div>
    </main>
  )
}

function Header({
  ambient,
  reduced,
  onToggleAmbient,
}: {
  ambient: boolean
  reduced: boolean
  onToggleAmbient: () => void
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30">
          <SparkleIcon className="size-5 text-white" />
        </span>
        <div>
          <p className="font-display text-xl leading-none text-white">Prism</p>
          <p className="text-xs text-muted-foreground">Music art wallpapers</p>
        </div>
      </div>

      <button
        onClick={onToggleAmbient}
        disabled={reduced}
        aria-pressed={ambient && !reduced}
        className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-2 text-xs font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        title={reduced ? "Disabled while reduced motion is on" : "Toggle animated ambience"}
      >
        <span
          className={`size-2 rounded-full transition-colors ${
            ambient && !reduced ? "bg-[var(--play)]" : "bg-muted-foreground"
          }`}
        />
        Ambient FX
      </button>
    </header>
  )
}

function Battery() {
  return (
    <span className="flex items-center gap-0.5" aria-label="Battery">
      <span className="relative h-3 w-6 rounded-[3px] border border-white/70">
        <span className="absolute inset-[1.5px] right-1.5 rounded-[1px] bg-white" />
      </span>
      <span className="h-1.5 w-0.5 rounded-r bg-white/70" />
    </span>
  )
}
