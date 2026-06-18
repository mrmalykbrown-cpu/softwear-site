"use client"

import { LiquidButton } from "@/components/ui/liquid-glass-button"
import { CoverArt } from "@/components/cover-art"
import {
  CheckIcon,
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "@/components/icons"
import { formatTime, type Track } from "@/lib/tracks"

interface WidgetProps {
  track: Track
  isPlaying: boolean
  /** 0–1 */
  progress: number
  applied: boolean
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onSetWallpaper: () => void
}

/**
 * Frosted "Now Playing" home-screen widget, built from the liquid-glass
 * button. Lives on top of the wallpaper inside the phone.
 */
export function NowPlayingWidget({
  track,
  isPlaying,
  progress,
  applied,
  onToggle,
  onPrev,
  onNext,
  onSetWallpaper,
}: WidgetProps) {
  const elapsed = Math.round(progress * track.duration)

  return (
    <div className="rounded-[1.6rem] border border-white/15 bg-black/25 p-4 shadow-2xl backdrop-blur-xl">
      {/* header row: artwork + meta + live eq */}
      <div className="flex items-center gap-3">
        <CoverArt
          spec={track.cover}
          className="h-14 w-14 shrink-0 rounded-xl ring-1 ring-white/20"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight text-white">
            {track.title}
          </p>
          <p className="truncate text-xs text-white/70">{track.artist}</p>
        </div>
        <Equalizer active={isPlaying} />
      </div>

      {/* progress */}
      <div className="mt-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-white/60">
          <span>{formatTime(elapsed)}</span>
          <span>-{formatTime(Math.max(0, track.duration - elapsed))}</span>
        </div>
      </div>

      {/* transport controls — liquid glass buttons */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <LiquidButton
          size="icon"
          aria-label="Previous track"
          onClick={onPrev}
          className="size-11 rounded-full text-white"
        >
          <SkipBackIcon className="size-5" />
        </LiquidButton>

        <LiquidButton
          size="icon"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={onToggle}
          className="size-16 rounded-full text-white"
        >
          {isPlaying ? (
            <PauseIcon className="size-7" />
          ) : (
            <PlayIcon className="size-7 translate-x-[1px]" />
          )}
        </LiquidButton>

        <LiquidButton
          size="icon"
          aria-label="Next track"
          onClick={onNext}
          className="size-11 rounded-full text-white"
        >
          <SkipForwardIcon className="size-5" />
        </LiquidButton>
      </div>

      {/* set as wallpaper — liquid glass button */}
      <LiquidButton
        size="lg"
        onClick={onSetWallpaper}
        aria-label="Download this cover as a phone wallpaper"
        className="mt-4 w-full rounded-2xl text-white"
      >
        {applied ? (
          <>
            <CheckIcon className="size-4 text-[var(--play)]" />
            Saved wallpaper
          </>
        ) : (
          <>
            <DownloadIcon className="size-4" />
            Set as wallpaper
          </>
        )}
      </LiquidButton>
    </div>
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
