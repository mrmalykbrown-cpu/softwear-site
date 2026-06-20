import type { CoverSpec } from "@/lib/cover"
import type { LyricLine } from "@/lib/lyrics"

export interface Track {
  id: string
  title: string
  artist: string
  /** seconds */
  duration: number
  /** beats per minute — drives the lyric beat-pulse */
  bpm: number
  cover: CoverSpec
  /** bundled time-synced demo lyrics (original placeholder words) */
  lines: LyricLine[]
}

function lrc(...rows: [number, string][]): LyricLine[] {
  return rows.map(([time, text]) => ({ time, text }))
}

export const tracks: Track[] = [
  {
    id: "neon-sunset",
    title: "Neon Sunset",
    artist: "Halcyon Drift",
    duration: 214,
    bpm: 112,
    cover: {
      from: "#2b1055",
      to: "#7597de",
      angle: 145,
      blobs: [
        { color: "#ff6b6b", x: 18, y: 22, r: 70, alpha: 0.85 },
        { color: "#ffd93d", x: 80, y: 18, r: 55, alpha: 0.7 },
        { color: "#ff2e93", x: 70, y: 80, r: 65, alpha: 0.8 },
      ],
    },
    lines: lrc(
      [2, "City lights are bleeding gold"],
      [9, "We chase the dusk, we lose control"],
      [17, "Neon rivers, painted skies"],
      [25, "I see the sunset in your eyes"],
      [34, "Hold on, the night is young"],
      [42, "Every color comes undone"],
      [50, "We drift where the daylight ends"],
      [59, "Burning bright, my friend"],
      [68, "Oh, let it glow, let it glow"],
      [78, "Into the amber afterglow"],
      [90, "City lights are bleeding gold"],
      [98, "I see the sunset in your eyes"]
    ),
  },
  {
    id: "midnight-city",
    title: "Midnight City",
    artist: "Velour",
    duration: 248,
    bpm: 104,
    cover: {
      from: "#020111",
      to: "#1b2a4a",
      angle: 160,
      blobs: [
        { color: "#5b8cff", x: 22, y: 30, r: 60, alpha: 0.8 },
        { color: "#22d3ee", x: 78, y: 28, r: 50, alpha: 0.7 },
        { color: "#7c3aed", x: 60, y: 85, r: 70, alpha: 0.75 },
      ],
    },
    lines: lrc(
      [3, "Streetlights hum a lullaby"],
      [11, "Concrete dreams and open sky"],
      [20, "We were ghosts on the avenue"],
      [29, "Midnight city, me and you"],
      [38, "Headlights tracing where we've been"],
      [47, "Glass towers we are reflected in"],
      [56, "Run until the morning comes"],
      [66, "Hearts beating like a hundred drums"],
      [77, "Midnight city, hold me close"],
      [88, "You're the pulse I love the most"]
    ),
  },
  {
    id: "aurora",
    title: "Aurora",
    artist: "Northern Lights",
    duration: 196,
    bpm: 92,
    cover: {
      from: "#021b1a",
      to: "#0a3d2e",
      angle: 130,
      blobs: [
        { color: "#34d399", x: 25, y: 25, r: 65, alpha: 0.85 },
        { color: "#22d3ee", x: 75, y: 35, r: 55, alpha: 0.75 },
        { color: "#a3e635", x: 55, y: 82, r: 60, alpha: 0.6 },
      ],
    },
    lines: lrc(
      [2, "Green fire dancing overhead"],
      [10, "Silence where the snow is spread"],
      [19, "Whispers in the polar air"],
      [28, "Aurora, take me anywhere"],
      [37, "Ribbons of a quiet flame"],
      [46, "Calling out without a name"],
      [56, "Under skies that softly burn"],
      [66, "To the north my heart returns"],
      [77, "Aurora, light the longest night"],
      [88, "Everything will be alright"]
    ),
  },
  {
    id: "cosmic-bloom",
    title: "Cosmic Bloom",
    artist: "Solene",
    duration: 263,
    bpm: 120,
    cover: {
      from: "#0d0221",
      to: "#3a015c",
      angle: 150,
      blobs: [
        { color: "#e040fb", x: 28, y: 24, r: 65, alpha: 0.85 },
        { color: "#7c4dff", x: 72, y: 30, r: 55, alpha: 0.8 },
        { color: "#ff4081", x: 64, y: 80, r: 60, alpha: 0.7 },
      ],
    },
    lines: lrc(
      [3, "Petals made of stardust fall"],
      [12, "A galaxy behind the wall"],
      [22, "We are seeds in violet space"],
      [31, "Blooming at a cosmic pace"],
      [41, "Gravity can't hold us down"],
      [51, "Floating like a weightless crown"],
      [62, "Open up and let it shine"],
      [72, "Your orbit tangled up in mine"],
      [84, "Cosmic bloom, forever wide"],
      [95, "Carry me to the other side"]
    ),
  },
  {
    id: "solar-flare",
    title: "Solar Flare",
    artist: "Kindred",
    duration: 231,
    bpm: 128,
    cover: {
      from: "#3a0a02",
      to: "#7a1f05",
      angle: 140,
      blobs: [
        { color: "#ff8a00", x: 26, y: 26, r: 65, alpha: 0.9 },
        { color: "#ffd000", x: 78, y: 22, r: 50, alpha: 0.75 },
        { color: "#ff3d00", x: 60, y: 82, r: 62, alpha: 0.8 },
      ],
    },
    lines: lrc(
      [2, "Ignite, the morning's on its way"],
      [10, "A spark to burn the gray away"],
      [19, "We rise like fire from the sea"],
      [28, "Solar flare, set me free"],
      [37, "Hotter than a thousand suns"],
      [47, "This is how the story runs"],
      [57, "Hold the light inside your chest"],
      [67, "Brighter than the rest"],
      [78, "Solar flare, never fade"],
      [89, "Out of the dark we're made"]
    ),
  },
  {
    id: "velvet-tide",
    title: "Velvet Tide",
    artist: "Maren Vox",
    duration: 205,
    bpm: 98,
    cover: {
      from: "#16021a",
      to: "#4a0e3a",
      angle: 155,
      blobs: [
        { color: "#ff2d78", x: 24, y: 28, r: 62, alpha: 0.85 },
        { color: "#b5179e", x: 76, y: 30, r: 55, alpha: 0.78 },
        { color: "#3a0ca3", x: 60, y: 84, r: 66, alpha: 0.72 },
      ],
    },
    lines: lrc(
      [3, "Soft as velvet, deep as wine"],
      [11, "The tide is pulling, yours and mine"],
      [20, "Waves of purple, hush and sway"],
      [30, "Carry all my doubts away"],
      [39, "Sink into the warm unknown"],
      [49, "Never have to be alone"],
      [60, "Velvet tide, roll over me"],
      [70, "Drown me gently in the sea"],
      [81, "Velvet tide, you're all I need"],
      [92, "Pull me under, set me free"]
    ),
  },
]

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
