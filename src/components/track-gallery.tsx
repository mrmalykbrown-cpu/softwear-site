"use client"

import { CoverArt } from "@/components/cover-art"
import { coverGlow } from "@/lib/cover"
import type { Track } from "@/lib/tracks"

interface GalleryProps {
  tracks: Track[]
  currentId: string
  onSelect: (index: number) => void
}

/** Grid of album art. Selecting a cover morphs the phone wallpaper. */
export function TrackGallery({ tracks, currentId, onSelect }: GalleryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tracks.map((track, i) => {
        const active = track.id === currentId
        return (
          <button
            key={track.id}
            onClick={() => onSelect(i)}
            aria-pressed={active}
            aria-label={`Play ${track.title} by ${track.artist}`}
            className="group relative cursor-pointer rounded-2xl text-left outline-none transition-transform duration-200 ease-out hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div
              className="relative aspect-square overflow-hidden rounded-2xl ring-1 ring-white/10 transition-shadow duration-300"
              style={
                active
                  ? { boxShadow: `0 12px 40px -8px ${coverGlow(track.cover)}aa` }
                  : undefined
              }
            >
              <CoverArt spec={track.cover} className="h-full w-full" />
              {active && (
                <div className="absolute inset-0 ring-2 ring-inset ring-white/80" />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 pt-8">
                <p className="truncate text-xs font-semibold text-white">
                  {track.title}
                </p>
                <p className="truncate text-[10px] text-white/70">{track.artist}</p>
              </div>
              {active && (
                <span className="absolute right-2 top-2 rounded-full bg-[var(--play)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
                  Live
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
