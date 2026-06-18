import { CapacitorHttp } from "@capacitor/core"

export interface LyricLine {
  /** start time in seconds */
  time: number
  text: string
}

/** Parse an LRC string ("[mm:ss.xx] text") into sorted, timed lines. */
export function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = []
  const re = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g
  for (const raw of lrc.split("\n")) {
    const text = raw.replace(re, "").trim()
    let m: RegExpExecArray | null
    re.lastIndex = 0
    const stamps: number[] = []
    while ((m = re.exec(raw)) !== null) {
      const min = parseInt(m[1], 10)
      const sec = parseInt(m[2], 10)
      const frac = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) / 1000 : 0
      stamps.push(min * 60 + sec + frac)
    }
    if (!text) continue
    for (const t of stamps) out.push({ time: t, text })
  }
  return out.sort((a, b) => a.time - b.time)
}

/** Index of the line that should be highlighted at `posSec` (-1 before first). */
export function activeIndex(lines: LyricLine[], posSec: number): number {
  if (!lines.length) return -1
  let lo = 0
  let hi = lines.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].time <= posSec + 0.15) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return ans
}

interface LrclibResult {
  syncedLyrics?: string | null
  plainLyrics?: string | null
}

/**
 * Fetch time-synced lyrics from LRCLIB (free, no key). Uses native HTTP so it
 * is not blocked by CORS inside the WebView. Returns null when unavailable.
 */
export async function fetchSyncedLyrics(
  title: string,
  artist: string,
  durationSec?: number
): Promise<LyricLine[] | null> {
  const clean = (s: string) => s.replace(/\s*[\(\[].*?[\)\]]\s*/g, "").trim()
  try {
    const params: Record<string, string> = {
      track_name: clean(title),
      artist_name: clean(artist),
    }
    if (durationSec && durationSec > 0) params.duration = String(Math.round(durationSec))

    let res = await CapacitorHttp.get({ url: "https://lrclib.net/api/get", params })
    let data = parse(res.data) as LrclibResult | null

    if (!data?.syncedLyrics) {
      // fall back to a fuzzy search
      const sr = await CapacitorHttp.get({
        url: "https://lrclib.net/api/search",
        params: { q: `${clean(title)} ${clean(artist)}` },
      })
      const arr = parse(sr.data) as LrclibResult[] | null
      data = Array.isArray(arr) ? arr.find((r) => r.syncedLyrics) ?? null : null
    }

    if (data?.syncedLyrics) {
      const lines = parseLrc(data.syncedLyrics)
      return lines.length ? lines : null
    }
    return null
  } catch {
    return null
  }
}

function parse(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  return data
}
