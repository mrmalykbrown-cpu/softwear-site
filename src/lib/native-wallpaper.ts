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
 * Native (Android) plugin. Only functional inside the APK; on the web the
 * methods reject, so always gate calls behind `isNativeApp()`.
 */
export const Wallpaper = registerPlugin<WallpaperPlugin>("Wallpaper")

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** Human-friendly source name from a package id. */
export function sourceName(pkg?: string): string {
  if (!pkg) return "your music app"
  if (pkg.includes("spotify")) return "Spotify"
  if (pkg.includes("apple")) return "Apple Music"
  if (pkg.includes("youtube")) return "YouTube Music"
  if (pkg.includes("deezer")) return "Deezer"
  if (pkg.includes("tidal")) return "TIDAL"
  if (pkg.includes("soundcloud")) return "SoundCloud"
  return pkg
}
