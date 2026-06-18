"use client"

import { useCallback, useEffect, useState } from "react"
import { LiquidButton } from "@/components/ui/liquid-glass-button"
import { CheckIcon, DownloadIcon, SparkleIcon, WallpaperIcon } from "@/components/icons"
import {
  Wallpaper,
  sourceName,
  type NowPlaying,
  type WallpaperTarget,
} from "@/lib/native-wallpaper"

const TARGETS: { id: WallpaperTarget; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "lock", label: "Lock" },
  { id: "both", label: "Both" },
]

/** Native-only control surface: streaming art -> device wallpaper. */
export function LivePanel() {
  const [access, setAccess] = useState<boolean | null>(null)
  const [np, setNp] = useState<NowPlaying | null>(null)
  const [target, setTarget] = useState<WallpaperTarget>("both")
  const [auto, setAuto] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const a = await Wallpaper.hasNotificationAccess()
      setAccess(a.granted)
      if (a.granted) setNp(await Wallpaper.getNowPlaying())
    } catch {
      setAccess(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    Wallpaper.getAutoApply()
      .then((r) => {
        setAuto(r.enabled)
        setTarget(r.target)
      })
      .catch(() => {})

    const poll = setInterval(refresh, 4000)
    const onVis = () => document.visibilityState === "visible" && refresh()
    document.addEventListener("visibilitychange", onVis)
    return () => {
      clearInterval(poll)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [refresh])

  const flash = (m: string) => {
    setMsg(m)
    window.setTimeout(() => setMsg(null), 3200)
  }

  const apply = async () => {
    setBusy(true)
    try {
      const r = await Wallpaper.applyWallpaper({ target })
      flash(`Wallpaper set${r.title ? ` — ${r.title}` : ""} (${target})`)
    } catch (e) {
      const code = (e as { message?: string })?.message ?? ""
      if (code.includes("NO_ART"))
        flash("Couldn't read album art — make sure a song is playing.")
      else if (code.includes("NO_ACCESS")) {
        flash("Notification access is required.")
        setAccess(false)
      } else flash("Couldn't set wallpaper.")
    } finally {
      setBusy(false)
    }
  }

  const toggleAuto = async () => {
    const enabled = !auto
    setAuto(enabled)
    try {
      await Wallpaper.setAutoApply({ enabled, target })
      flash(enabled ? "Auto-update on — wallpaper follows your music." : "Auto-update off.")
    } catch {
      setAuto(!enabled)
    }
  }

  const changeTarget = async (t: WallpaperTarget) => {
    setTarget(t)
    if (auto) await Wallpaper.setAutoApply({ enabled: true, target: t }).catch(() => {})
  }

  return (
    <section className="rounded-3xl border border-border bg-card/70 p-5 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-secondary">
          <WallpaperIcon className="size-4 text-white" />
        </span>
        <div>
          <h3 className="font-display text-lg leading-none text-white">Live wallpaper</h3>
          <p className="text-xs text-muted-foreground">From Spotify · Apple Music</p>
        </div>
      </div>

      {access === false && (
        <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
          <p className="text-sm text-foreground">
            To read the cover from your music app, Prism needs{" "}
            <span className="font-semibold">Notification access</span>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <LiquidButton
              size="default"
              className="rounded-xl text-white"
              onClick={() => Wallpaper.openNotificationAccess()}
            >
              <SparkleIcon className="size-4" />
              Grant access
            </LiquidButton>
            <button
              onClick={refresh}
              className="cursor-pointer rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              I&apos;ve enabled it
            </button>
          </div>
        </div>
      )}

      {access && (
        <>
          {/* now playing */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-3">
            {np?.hasArt && np.art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={np.art}
                alt=""
                className="size-14 shrink-0 rounded-xl object-cover ring-1 ring-white/15"
              />
            ) : (
              <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                <WallpaperIcon className="size-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {np?.playing ? (
                <>
                  <p className="truncate text-sm font-semibold text-white">
                    {np.title ?? "Unknown track"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {np.artist ?? ""} · {sourceName(np.app)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Play a song in Spotify or Apple Music…
                </p>
              )}
            </div>
          </div>

          {/* target */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Apply to
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TARGETS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => changeTarget(t.id)}
                  aria-pressed={target === t.id}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    target === t.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* actions */}
          <LiquidButton
            size="lg"
            disabled={busy || !np?.hasArt}
            onClick={apply}
            className="mt-4 w-full rounded-2xl text-white"
          >
            <DownloadIcon className="size-4" />
            {busy ? "Setting…" : "Set wallpaper from current song"}
          </LiquidButton>

          <button
            onClick={toggleAuto}
            aria-pressed={auto}
            className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-2xl border border-border bg-background/40 px-4 py-3 text-left transition-colors hover:bg-accent"
          >
            <span>
              <span className="block text-sm font-medium text-white">
                Auto-update on song change
              </span>
              <span className="block text-xs text-muted-foreground">
                Wallpaper follows whatever you play
              </span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                auto ? "bg-[var(--play)]" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 grid size-5 place-items-center rounded-full bg-white transition-all ${
                  auto ? "left-[22px]" : "left-0.5"
                }`}
              >
                {auto && <CheckIcon className="size-3 text-[var(--play)]" />}
              </span>
            </span>
          </button>
        </>
      )}

      {msg && (
        <p className="mt-3 text-center text-xs text-muted-foreground" aria-live="polite">
          {msg}
        </p>
      )}
    </section>
  )
}
