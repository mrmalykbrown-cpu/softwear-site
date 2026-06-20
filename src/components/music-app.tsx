"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, useMotionValue } from "motion/react"
import { Haptics, ImpactStyle } from "@capacitor/haptics"
import { Wallpaper } from "@/components/wallpaper"
import { Lyrics } from "@/components/lyrics"
import { NowPlayingWidget } from "@/components/now-playing-widget"
import { TrackGallery } from "@/components/track-gallery"
import { CoverArt } from "@/components/cover-art"
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  QuoteIcon,
  SparkleIcon,
  WifiIcon,
} from "@/components/icons"
import { tracks } from "@/lib/tracks"
import { coverIsLight, coverToDataUri, downloadCover, imageIsLight } from "@/lib/cover"
import { activeIndex, fetchSyncedLyrics, type LyricLine } from "@/lib/lyrics"
import {
  Wallpaper as NativeWallpaper,
  isNativeApp,
  sourceName,
  type Playback,
  type WallpaperTarget,
} from "@/lib/native-wallpaper"

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function haptic(style: ImpactStyle = ImpactStyle.Light) {
  if (isNativeApp()) Haptics.impact({ style }).catch(() => {})
}

export function MusicApp() {
  // shared UI state
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [lyricsOn, setLyricsOn] = useState(true)
  const [lyricSize, setLyricSize] = useState(1)
  const [clock, setClock] = useState("9:41")
  const [dateStr, setDateStr] = useState("")
  const [native, setNative] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [applied, setApplied] = useState(false)
  const [target, setTarget] = useState<WallpaperTarget>("both")
  const [autoApply, setAutoApply] = useState(false)

  // demo (web / library) state
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const dragX = useMotionValue(0)

  // native live state
  const [live, setLive] = useState<Playback | null>(null)
  const [liveArt, setLiveArt] = useState<string | undefined>(undefined)
  const [liveLines, setLiveLines] = useState<LyricLine[]>([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveLight, setLiveLight] = useState(false)
  const [preferLive, setPreferLive] = useState(true)

  const demoTrack = tracks[index]

  const liveAvailable = native && !!live?.access && (!!liveArt || !!live?.title)
  const useLive = liveAvailable && preferLive

  // ---- effects ------------------------------------------------------------

  useEffect(() => setNative(isNativeApp()), [])

  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle("dark", theme === "dark")
  }, [theme])

  // Time/date are set only after mount so server-rendered HTML and the first
  // client render are identical (avoids locale/timezone hydration mismatches).
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))
      setDateStr(d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }))
    }
    tick()
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [])

  // demo progress
  useEffect(() => {
    if (useLive || !isPlaying) return
    const id = setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.4 / demoTrack.duration))
    }, 400)
    return () => clearInterval(id)
  }, [useLive, isPlaying, demoTrack.duration])

  useEffect(() => {
    if (useLive || progress < 1) return
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % tracks.length)
      setProgress(0)
    }, 400)
    return () => clearTimeout(t)
  }, [useLive, progress])

  // load saved auto-apply pref on native
  useEffect(() => {
    if (!native) return
    NativeWallpaper.getAutoApply()
      .then((r) => {
        setAutoApply(r.enabled)
        setTarget(r.target)
      })
      .catch(() => {})
  }, [native])

  // native polling: playback + (on track change) art + lyrics
  useEffect(() => {
    if (!native) return
    let alive = true
    let lastTitle = ""
    const poll = async () => {
      try {
        const p = await NativeWallpaper.getPlayback()
        if (!alive) return
        setLive(p)
        const t = p.title ?? ""
        if (p.access && t && t !== lastTitle) {
          lastTitle = t
          NativeWallpaper.getNowPlaying()
            .then((np) => {
              if (!alive) return
              setLiveArt(np.art)
              if (np.art) imageIsLight(np.art).then((l) => alive && setLiveLight(l))
            })
            .catch(() => {})
          setLiveLoading(true)
          fetchSyncedLyrics(t, p.artist ?? "", p.duration).then((lines) => {
            if (!alive) return
            setLiveLines(lines ?? [])
            setLiveLoading(false)
          })
        }
      } catch {
        /* ignore */
      }
    }
    poll()
    const id = setInterval(poll, 700)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [native])

  // ---- view model ---------------------------------------------------------

  const view = useMemo(() => {
    if (useLive && live) {
      return {
        id: `live:${live.title ?? ""}`,
        title: live.title || "Unknown track",
        artist: live.artist || sourceName(live.app),
        durationSec: live.duration || 0,
        positionSec: live.position || 0,
        image: liveArt,
        cover: undefined,
        lines: liveLines,
        lyricsLoading: liveLoading,
        lightWallpaper: liveLight,
        isPlaying: !!live.playing,
        bpm: 120,
      }
    }
    return {
      id: demoTrack.id,
      title: demoTrack.title,
      artist: demoTrack.artist,
      durationSec: demoTrack.duration,
      positionSec: progress * demoTrack.duration,
      image: undefined,
      cover: demoTrack.cover,
      lines: demoTrack.lines,
      lyricsLoading: false,
      lightWallpaper: coverIsLight(demoTrack.cover),
      isPlaying,
      bpm: demoTrack.bpm,
    }
  }, [useLive, live, liveArt, liveLines, liveLoading, liveLight, demoTrack, progress, isPlaying])

  const progressFrac = view.durationSec ? clamp(view.positionSec / view.durationSec, 0, 1) : 0
  const ai = activeIndex(view.lines, view.positionSec)
  const currentLyric = ai >= 0 ? view.lines[ai]?.text ?? "" : ""
  const onScrub = (frac: number) => {
    if (useLive) NativeWallpaper.seekTo({ position: frac * (view.durationSec || 0) }).catch(() => {})
    else setProgress(clamp(frac, 0, 1))
  }
  const onColor = view.lightWallpaper ? "rgba(12,12,20,0.92)" : "rgba(255,255,255,0.95)"
  const subColor = view.lightWallpaper ? "rgba(12,12,20,0.6)" : "rgba(255,255,255,0.72)"
  const scrim = view.lightWallpaper
    ? "linear-gradient(to bottom, rgba(255,255,255,0.3), transparent 28%, transparent 55%, rgba(255,255,255,0.2))"
    : "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 26%, transparent 52%, rgba(0,0,0,0.62))"

  // ---- handlers -----------------------------------------------------------

  const togglePlay = () => {
    haptic()
    if (useLive) {
      NativeWallpaper.mediaControl({ action: "playpause" }).catch(() => {})
      return
    }
    setIsPlaying((p) => !p)
  }
  const next = () => {
    haptic()
    if (useLive) {
      NativeWallpaper.mediaControl({ action: "next" }).catch(() => {})
      return
    }
    setIndex((i) => (i + 1) % tracks.length)
    setProgress(0)
  }
  const prev = () => {
    haptic()
    if (useLive) {
      NativeWallpaper.mediaControl({ action: "prev" }).catch(() => {})
      return
    }
    setIndex((i) => (i - 1 + tracks.length) % tracks.length)
    setProgress(0)
  }

  const pickTrack = (i: number) => {
    haptic()
    setIndex(i)
    setProgress(0)
    setPreferLive(false)
    setLibraryOpen(false)
  }

  const setWallpaperNow = useCallback(async () => {
    haptic(ImpactStyle.Medium)
    setApplied(true)
    try {
      if (native) {
        if (useLive) await NativeWallpaper.applyWallpaper({ target })
        else await NativeWallpaper.setWallpaperFromBase64({ data: coverToDataUri(demoTrack.cover), target })
      } else {
        await downloadCover(demoTrack.cover, `${demoTrack.id}-wallpaper`)
      }
    } catch {
      /* toast still shows intent */
    }
    window.setTimeout(() => setApplied(false), 2600)
  }, [native, useLive, target, demoTrack])

  const toggleAuto = async () => {
    const enabled = !autoApply
    setAutoApply(enabled)
    try {
      await NativeWallpaper.setAutoApply({ enabled, target })
    } catch {
      setAutoApply(!enabled)
    }
  }

  // ---- render -------------------------------------------------------------

  return (
    <main className="fixed inset-0 overflow-hidden">
      <Wallpaper
        id={view.id}
        spec={view.cover ?? demoTrack.cover}
        image={view.image}
        playing={view.isPlaying}
        dragX={dragX}
      />
      <div className="pointer-events-none absolute inset-0 z-[1]" style={{ background: scrim }} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col px-5 pb-5 pt-3"
      >
        {/* status bar */}
        <div
          className="flex items-center justify-between text-[11px] font-semibold"
          style={{ color: onColor }}
        >
          <span className="tabular-nums">{clock}</span>
          <span className="flex items-center gap-1.5">
            {useLive && live?.app ? sourceName(live.app) : "Prism"}
            <WifiIcon className="size-3.5" />
            <Battery color={onColor} />
          </span>
        </div>

        {/* clock */}
        <div className="mt-2 text-center" style={{ color: onColor }}>
          <p
            className="min-h-[1em] text-[11px] font-medium uppercase tracking-[0.2em]"
            style={{ color: subColor }}
          >
            {dateStr}
          </p>
          <p className="font-light tabular-nums leading-none" style={{ fontSize: "clamp(3rem,15vw,4.5rem)" }}>
            {clock}
          </p>
        </div>

        {/* center: lyrics or big art */}
        <div className="relative my-3 min-h-0 flex-1">
          {lyricsOn && native && !live?.access ? (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-full w-full flex-col items-center justify-center gap-2 px-10 text-center"
              style={{ color: onColor }}
            >
              <QuoteIcon className="size-8 opacity-80" />
              <span className="text-lg font-semibold">Tap to enable lyrics</span>
              <span className="text-sm opacity-70">
                Grant Notification access to sync words from your music
              </span>
            </button>
          ) : lyricsOn ? (
            <Lyrics
              lines={view.lines}
              positionSec={view.positionSec}
              lightWallpaper={view.lightWallpaper}
              sizeScale={lyricSize}
              playing={view.isPlaying}
              bpm={view.bpm}
              loading={view.lyricsLoading}
              onSeek={
                useLive ? undefined : (sec) => setProgress(clamp(sec / view.durationSec, 0, 1))
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              {view.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={view.image}
                  alt=""
                  className="aspect-square w-[78%] rounded-3xl object-cover shadow-2xl ring-1 ring-white/15"
                />
              ) : (
                <CoverArt
                  spec={view.cover ?? demoTrack.cover}
                  className="aspect-square w-[78%] rounded-3xl shadow-2xl ring-1 ring-white/15"
                />
              )}
            </div>
          )}

          {/* swipe the art left / right to change track */}
          <motion.div
            className="absolute inset-0 z-20"
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            style={{ x: dragX, touchAction: "pan-y" }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -55 || info.velocity.x < -450) next()
              else if (info.offset.x > 55 || info.velocity.x > 450) prev()
            }}
          />
        </div>

        {/* page indicator — also hints the art is swipeable */}
        {!useLive && (
          <div className="mb-3 flex items-center justify-center gap-1.5" aria-hidden>
            {tracks.map((t, i) => (
              <motion.span
                key={t.id}
                className="h-1.5 rounded-full"
                animate={{ width: i === index ? 18 : 6, opacity: i === index ? 0.95 : 0.4 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ background: onColor }}
              />
            ))}
          </div>
        )}

        {/* widget */}
        <NowPlayingWidget
          title={view.title}
          artist={view.artist}
          cover={view.cover ?? demoTrack.cover}
          image={view.image}
          isPlaying={view.isPlaying}
          progress={progressFrac}
          durationSec={view.durationSec}
          lyricLine={currentLyric}
          onSeek={onScrub}
          lyricsOn={lyricsOn}
          theme={theme}
          onToggle={togglePlay}
          onPrev={prev}
          onNext={next}
          onToggleLyrics={() => setLyricsOn((v) => !v)}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          onLyricSize={(d) => setLyricSize((s) => clamp(s + d * 0.12, 0.7, 1.8))}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenLibrary={() => setLibraryOpen(true)}
        />
      </motion.div>

      {/* library sheet */}
      <Sheet open={libraryOpen} onClose={() => setLibraryOpen(false)} title="Art library">
        {native && !preferLive && liveAvailable && (
          <button
            onClick={() => {
              setPreferLive(true)
              setLibraryOpen(false)
            }}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <SparkleIcon className="size-4" /> Sync with my music
          </button>
        )}
        <TrackGallery tracks={tracks} currentId={demoTrack.id} onSelect={pickTrack} />
      </Sheet>

      {/* settings sheet */}
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Wallpaper">
        {native && !live?.access && (
          <div className="mb-5 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">
              Enable lyrics &amp; now-playing
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Android needs Notification access to read the song and art from Spotify or
              Apple Music.
            </p>
            <button
              onClick={() => NativeWallpaper.openNotificationAccess()}
              className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Open notification access
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Toggle greyed out? Because Prism was sideloaded, Samsung blocks it as a
              &ldquo;restricted setting&rdquo;. Open{" "}
              <b>Settings → Apps → Prism → ⋮ (top-right) → Allow restricted settings</b>,
              then enable Prism under Notification access.
            </p>
          </div>
        )}
        {native && live?.access && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm text-foreground">
            <CheckIcon className="size-4 text-[var(--play)]" />
            Connected{live.app ? ` — ${sourceName(live.app)}` : ""}
          </div>
        )}
        <p className="mb-4 text-sm text-muted-foreground">
          {native
            ? useLive
              ? "Sets your real wallpaper from the cover playing now."
              : "Sets your real wallpaper from the selected art."
            : "Exports the artwork as a phone-resolution image (open it as an APK to set it directly)."}
        </p>

        {native && (
          <>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Apply to
            </p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {(["home", "lock", "both"] as WallpaperTarget[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  aria-pressed={target === t}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    target === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          onClick={setWallpaperNow}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          {applied ? <CheckIcon className="size-4" /> : <DownloadIcon className="size-4" />}
          {applied ? "Done" : native ? "Set wallpaper now" : "Download wallpaper"}
        </button>

        {native && (
          <button
            onClick={toggleAuto}
            aria-pressed={autoApply}
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
          >
            <span>
              <span className="block text-sm font-medium text-foreground">
                Auto-update on song change
              </span>
              <span className="block text-xs text-muted-foreground">
                Wallpaper follows your music
              </span>
            </span>
            <Switch on={autoApply} />
          </button>
        )}
      </Sheet>

      {/* toast */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        <div
          className={`glass rounded-full px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-300 ${
            applied ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          {native ? "Wallpaper updated." : "Wallpaper image downloaded."}
        </div>
      </div>
    </main>
  )
}

function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-label={title}
        className={`glass fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 pb-8 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-foreground/25" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full text-foreground transition-colors hover:bg-accent"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-[var(--play)]" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </span>
  )
}

function Battery({ color }: { color: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label="Battery">
      <span
        className="relative h-3 w-6 rounded-[3px] border"
        style={{ borderColor: color }}
      >
        <span
          className="absolute inset-[1.5px] right-1.5 rounded-[1px]"
          style={{ background: color }}
        />
      </span>
      <span className="h-1.5 w-0.5 rounded-r" style={{ background: color }} />
    </span>
  )
}
