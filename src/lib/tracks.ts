import type { CoverSpec } from "@/lib/cover"

export interface Track {
  id: string
  title: string
  artist: string
  /** seconds */
  duration: number
  cover: CoverSpec
}

export const tracks: Track[] = [
  {
    id: "neon-sunset",
    title: "Neon Sunset",
    artist: "Halcyon Drift",
    duration: 214,
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
  },
  {
    id: "midnight-city",
    title: "Midnight City",
    artist: "Velour",
    duration: 248,
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
  },
  {
    id: "aurora",
    title: "Aurora",
    artist: "Northern Lights",
    duration: 196,
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
  },
  {
    id: "cosmic-bloom",
    title: "Cosmic Bloom",
    artist: "Solene",
    duration: 263,
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
  },
  {
    id: "solar-flare",
    title: "Solar Flare",
    artist: "Kindred",
    duration: 231,
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
  },
  {
    id: "velvet-tide",
    title: "Velvet Tide",
    artist: "Maren Vox",
    duration: 205,
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
  },
]

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
