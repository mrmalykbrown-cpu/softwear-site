import { Capacitor, registerPlugin } from "@capacitor/core"

export type WallpaperTarget = "home" | "lock" | "both"

export interface NowPlaying {
  /** whether Notification access is granted */
  access: boolean
  playing: boolean
  app?: string
  title?: string | null
  artist?: string | null
  hasArt?: boolean
  /** data: URI thumbnail for preview */
  art?: string
}

export interface Playback {
  access: boolean
  playing: boolean
  /** seconds */
  position: number
  /** seconds */
  duration: number
  app?: string
  title?: string | null
  artist?: string | null
  hasArt?: boolean
  /** data: URI of the album art (full size we can read) */
  art?: string
}

export interface WallpaperPlugin {
  hasNotificationAccess(): Promise<{ granted: boolean }>
  openNotificationAccess(): Promise<void>
  getNowPlaying(): Promise<NowPlaying>
  /** Rich now-playing snapshot incl. position/duration for lyric sync. */
  getPlayback(): Promise<Playback>
  /** Control the active media session (Spotify / Apple Music / ...). */
  mediaControl(opts: {
    action: "playpause" | "play" | "pause" | "next" | "prev"
  }): Promise<void>
  /** Seek the active media session to a position (seconds). */
  seekTo(opts: { position: number }): Promise<void>
  applyWallpaper(opts: { target: WallpaperTarget }): Promise<{
    applied: boolean
    target: string
    title?: string
    app?: string
  }>
  setWallpaperFromBase64(opts: {
    data: string
    target: WallpaperTarget
  }): Promise<{ applied: boolean; target: string }>
  setAutoApply(opts: {
    enabled: boolean
    target: WallpaperTarget
  }): Promise<{ enabled: boolean; target: WallpaperTarget }>
  getAutoApply(): Promise<{ enabled: boolean; target: WallpaperTarget }>
}

/**
 * Native plugin. On Android this is the Capacitor "Wallpaper" plugin; on
 * Windows (Electron) it's the `window.prism` bridge exposed by the preload.
 * On the plain web the methods reject, so always gate calls behind
 * `isNativeApp()`.
 */
interface PrismBridge {
  platform: string
  getPlayback(): Promise<Playback>
  getNowPlaying(): Promise<NowPlaying>
  mediaControl(opts: { action: string }): Promise<void>
  seekTo(opts: { position: number }): Promise<void>
  setWallpaperFromBase64(
    data: string,
    target: WallpaperTarget
  ): Promise<{ applied: boolean; target: string }>
  applyWallpaper(target: WallpaperTarget): Promise<{ applied: boolean; target: string }>
  getAutoApply(): Promise<{ enabled: boolean; target: WallpaperTarget }>
  setAutoApply(
    enabled: boolean,
    target: WallpaperTarget
  ): Promise<{ enabled: boolean; target: WallpaperTarget }>
  window: { minimize(): void; maximize(): void; close(): void }
}

function prismBridge(): PrismBridge | null {
  if (typeof window === "undefined") return null
  const p = (window as unknown as { prism?: PrismBridge }).prism
  return p && p.platform === "electron" ? p : null
}

/** True when running inside the Windows (Electron) desktop app. */
export function isElectron(): boolean {
  return prismBridge() !== null
}

/** Frameless-window controls (Electron only); null elsewhere. */
export function windowControls(): PrismBridge["window"] | null {
  return prismBridge()?.window ?? null
}

const electronWallpaper: WallpaperPlugin = {
  hasNotificationAccess: async () => ({ granted: true }),
  openNotificationAccess: async () => {},
  getNowPlaying: () => prismBridge()!.getNowPlaying(),
  getPlayback: () => prismBridge()!.getPlayback(),
  mediaControl: (o) => prismBridge()!.mediaControl(o),
  seekTo: (o) => prismBridge()!.seekTo(o),
  applyWallpaper: (o) => prismBridge()!.applyWallpaper(o.target),
  setWallpaperFromBase64: (o) => prismBridge()!.setWallpaperFromBase64(o.data, o.target),
  getAutoApply: () => prismBridge()!.getAutoApply(),
  setAutoApply: (o) => prismBridge()!.setAutoApply(o.enabled, o.target),
}

export const Wallpaper: WallpaperPlugin = isElectron()
  ? electronWallpaper
  : registerPlugin<WallpaperPlugin>("Wallpaper")

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform() || isElectron()
}

/** Human-friendly source name from an Android package id or Windows AUMID. */
export function sourceName(pkg?: string): string {
  if (!pkg) return "your music app"
  const p = pkg.toLowerCase()
  if (p.includes("spotify")) return "Spotify"
  if (p.includes("apple") || p.includes("music.ui")) return "Apple Music"
  if (p.includes("youtube")) return "YouTube Music"
  if (p.includes("deezer")) return "Deezer"
  if (p.includes("tidal")) return "TIDAL"
  if (p.includes("soundcloud")) return "SoundCloud"
  if (p.includes("chrome")) return "Chrome"
  if (p.includes("msedge") || p.includes("edge")) return "Edge"
  if (p.includes("firefox")) return "Firefox"
  if (p.includes("groove") || p.includes("zune")) return "Groove"
  return pkg
}
