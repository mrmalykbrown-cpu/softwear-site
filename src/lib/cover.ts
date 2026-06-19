/**
 * Album-art engine.
 *
 * Each cover is a structured mesh-gradient spec (a base linear gradient plus a
 * few radial "blobs"). The same spec renders two ways:
 *   - coverBackground()  -> a CSS `background` string for on-screen art
 *   - renderCoverToCanvas() / downloadCover() -> a real PNG at phone resolution
 *
 * Keeping art as data (not bitmaps) means it is tiny, sharp at any size, and
 * exportable as an actual wallpaper you can set on a real device.
 */

export interface Blob {
  /** hex color, e.g. "#ff6b6b" */
  color: string
  /** 0–100, horizontal position */
  x: number
  /** 0–100, vertical position */
  y: number
  /** 0–100, radius as a percentage of the surface */
  r: number
  /** 0–1, peak opacity at the blob center */
  alpha: number
}

export interface CoverSpec {
  from: string
  to: string
  /** base gradient angle in degrees */
  angle: number
  blobs: Blob[]
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h
  const int = parseInt(full, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function relLuminance(hex: string): number {
  const lin = hexToRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

/** Is this cover light overall? Used to pick a contrasting lyric color. */
export function coverIsLight(spec: CoverSpec): boolean {
  if (!spec || !spec.blobs) return false
  let sum = (relLuminance(spec.from) + relLuminance(spec.to)) * 0.6
  let weight = 1.2
  for (const b of spec.blobs) {
    sum += relLuminance(b.color) * b.alpha
    weight += b.alpha
  }
  return sum / weight > 0.42
}

/** Average luminance of an image (data URI ok) -> is it light? */
export function imageIsLight(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(false)
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const c = document.createElement("canvas")
        c.width = 16
        c.height = 16
        const ctx = c.getContext("2d")
        if (!ctx) return resolve(false)
        ctx.drawImage(img, 0, 0, 16, 16)
        const d = ctx.getImageData(0, 0, 16, 16).data
        let sum = 0
        for (let i = 0; i < d.length; i += 4) {
          sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
        }
        resolve(sum / (d.length / 4) / 255 > 0.55)
      } catch {
        resolve(false)
      }
    }
    img.onerror = () => resolve(false)
    img.src = url
  })
}

/** A CSS `background` value (layered radial gradients over a linear base). */
export function coverBackground(spec: CoverSpec): string {
  if (!spec || !spec.blobs) return "linear-gradient(160deg, #15152e, #0f0f23)"
  const layers = spec.blobs.map(
    (b) =>
      `radial-gradient(${b.r}% ${b.r}% at ${b.x}% ${b.y}%, ${rgba(
        b.color,
        b.alpha
      )} 0%, ${rgba(b.color, 0)} 70%)`
  )
  return [...layers, `linear-gradient(${spec.angle}deg, ${spec.from}, ${spec.to})`].join(
    ", "
  )
}

/** Average-ish dominant color, handy for glows / theming. */
export function coverGlow(spec: CoverSpec): string {
  return spec.blobs[0]?.color ?? spec.from
}

/** Paint a cover onto a canvas at an arbitrary resolution. */
export function renderCoverToCanvas(
  spec: CoverSpec,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return canvas

  // base linear gradient
  const rad = (spec.angle * Math.PI) / 180
  const cx = width / 2
  const cy = height / 2
  const half = Math.max(width, height)
  const dx = (Math.cos(rad) * half) / 2
  const dy = (Math.sin(rad) * half) / 2
  const base = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy)
  base.addColorStop(0, spec.from)
  base.addColorStop(1, spec.to)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  // radial blobs
  const maxDim = Math.max(width, height)
  for (const b of spec.blobs) {
    const bx = (b.x / 100) * width
    const by = (b.y / 100) * height
    const radius = (b.r / 100) * maxDim
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, radius)
    g.addColorStop(0, rgba(b.color, b.alpha))
    g.addColorStop(0.7, rgba(b.color, 0))
    g.addColorStop(1, rgba(b.color, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, width, height)
  }

  // subtle vignette for a wallpaper-y depth
  const vg = ctx.createRadialGradient(cx, cy * 0.9, height * 0.2, cx, cy, height * 0.75)
  vg.addColorStop(0, "rgba(0,0,0,0)")
  vg.addColorStop(1, "rgba(0,0,0,0.35)")
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, width, height)

  return canvas
}

/** Render the cover to a phone-sized JPEG data URI (for native wallpaper set). */
export function coverToDataUri(spec: CoverSpec, width = 1170, height = 2532): string {
  const canvas = renderCoverToCanvas(spec, width, height)
  return canvas.toDataURL("image/jpeg", 0.9)
}

/** Export the cover as a PNG sized for a phone screen and trigger a download. */
export function downloadCover(
  spec: CoverSpec,
  filename: string,
  width = 1170,
  height = 2532
): Promise<void> {
  return new Promise((resolve) => {
    const canvas = renderCoverToCanvas(spec, width, height)
    canvas.toBlob((blob) => {
      if (!blob) return resolve()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${filename}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      resolve()
    }, "image/png")
  })
}
