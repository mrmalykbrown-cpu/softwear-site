"use client"

import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"
import { LiquidButton } from "@/components/ui/liquid-glass-button"
import { CoverArt } from "@/components/cover-art"
import {
  GridIcon,
  MoonIcon,
  PauseIcon,
  PlayIcon,
  QuoteIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SlidersIcon,
  SunIcon,
} from "@/components/icons"
import { formatTime } from "@/lib/tracks"
import type { CoverSpec } from "@/lib/cover"

interface WidgetProps {
  title: string
  artist: string
  cover?: CoverSpec
  image?: string
  isPlaying: boolean
  progress: number
  durationSec: number
  lyricsOn: boolean
  theme: "light" | "dark"
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onToggleLyrics: () => void
  onToggleTheme: () => void
  onLyricSize: (delta: number) => void
  onOpenSettings: () => void
  onOpenLibrary: () => void
}

const press = { type: "spring" as const, stiffness: 520, damping: 30 }

/** Samsung-blur glass control widget with spring-tactile, bezel-free controls. */
export function NowPlayingWidget(props: WidgetProps) {
  const {
    title,
    artist,
    cover,
    image,
    isPlaying,
    progress,
    durationSec,
    lyricsOn,
    theme,
    onToggle,
    onPrev,
    onNext,
    onToggleLyrics,
    onToggleTheme,
    onLyricSize,
    onOpenSettings,
    onOpenLibrary,
  } = props
  const elapsed = Math.round(progress * durationSec)

  return (
    <div className="glass rounded-[1.9rem] p-4 text-foreground">
      {/* meta */}
      <div className="flex items-center gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="size-14 shrink-0 rounded-xl object-cover ring-1 ring-white/15"
          />
        ) : (
          <CoverArt
            spec={cover!}
            className="size-14 shrink-0 rounded-xl ring-1 ring-white/15"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{title}</p>
          <p className="truncate text-xs opacity-70">{artist}</p>
        </div>
        <Equalizer active={isPlaying} />
      </div>

      {/* progress */}
      <div className="mt-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/15">
          <motion.div
            className="h-full rounded-full bg-foreground"
            animate={{ width: `${Math.min(100, progress * 100)}%` }}
            transition={{ ease: "linear", duration: 0.4 }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] tabular-nums opacity-60">
          <span>{formatTime(elapsed)}</span>
          <span>-{formatTime(Math.max(0, durationSec - elapsed))}</span>
        </div>
      </div>

      {/* transport — liquid glass, spring-tactile */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <Tap>
          <LiquidButton
            size="icon"
            aria-label="Previous track"
            onClick={onPrev}
            className="size-11 rounded-full"
          >
            <SkipBackIcon className="size-5" />
          </LiquidButton>
        </Tap>
        <Tap>
          <LiquidButton
            size="icon"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={onToggle}
            className="size-16 rounded-full"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={isPlaying ? "pause" : "play"}
                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="grid place-items-center"
              >
                {isPlaying ? (
                  <PauseIcon className="size-7" />
                ) : (
                  <PlayIcon className="size-7 translate-x-[1px]" />
                )}
              </motion.span>
            </AnimatePresence>
          </LiquidButton>
        </Tap>
        <Tap>
          <LiquidButton
            size="icon"
            aria-label="Next track"
            onClick={onNext}
            className="size-11 rounded-full"
          >
            <SkipForwardIcon className="size-5" />
          </LiquidButton>
        </Tap>
      </div>

      {/* options */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Pill active={lyricsOn} onClick={onToggleLyrics} aria-label="Toggle lyrics">
          <QuoteIcon className="size-4" />
          Lyrics
        </Pill>
        <Pill onClick={onToggleTheme} aria-label="Toggle day or night mode">
          {theme === "dark" ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
          {theme === "dark" ? "Night" : "Day"}
        </Pill>
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-card/60 px-1 py-1">
          <IconBtn onClick={() => onLyricSize(-1)} aria-label="Smaller lyrics">
            <span className="text-xs font-bold">A−</span>
          </IconBtn>
          <IconBtn onClick={() => onLyricSize(1)} aria-label="Larger lyrics">
            <span className="text-base font-bold">A+</span>
          </IconBtn>
        </div>
        <Pill onClick={onOpenSettings} aria-label="Wallpaper settings">
          <SlidersIcon className="size-4" />
          Wallpaper
        </Pill>
        <Pill onClick={onOpenLibrary} aria-label="Open art library">
          <GridIcon className="size-4" />
          Library
        </Pill>
      </div>
    </div>
  )
}

function Tap({ children }: { children: ReactNode }) {
  return (
    <motion.div whileTap={{ scale: 0.88 }} transition={press} className="inline-flex">
      {children}
    </motion.div>
  )
}

function Pill({
  active,
  children,
  ...rest
}: { active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      {...(rest as React.ComponentProps<typeof motion.button>)}
      whileTap={{ scale: 0.93 }}
      transition={press}
      aria-pressed={active}
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card/60 text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </motion.button>
  )
}

function IconBtn({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      {...(rest as React.ComponentProps<typeof motion.button>)}
      whileTap={{ scale: 0.85 }}
      transition={press}
      className="grid size-7 cursor-pointer place-items-center rounded-full text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </motion.button>
  )
}

function Equalizer({ active }: { active: boolean }) {
  const bars = [0, 0.18, 0.36, 0.12]
  return (
    <div className="flex h-7 items-end gap-[3px]" aria-hidden>
      {bars.map((delay, i) => (
        <span
          key={i}
          className="eq-bar w-[3px] rounded-full bg-[var(--play)]"
          style={{
            height: "100%",
            animationDelay: `${delay}s`,
            animationPlayState: active ? "running" : "paused",
            opacity: active ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  )
}
