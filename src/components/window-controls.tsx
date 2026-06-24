"use client"

import { useEffect, useState } from "react"
import { windowControls } from "@/lib/native-wallpaper"

/**
 * Frameless-window chrome for the Windows (Electron) desktop app: a draggable
 * strip across the top plus minimize / close buttons. Renders nothing on
 * Android or the web.
 */
export function WindowControls() {
  const [ctl, setCtl] = useState<ReturnType<typeof windowControls>>(null)

  useEffect(() => setCtl(windowControls()), [])

  if (!ctl) return null

  return (
    <>
      <div aria-hidden className="drag-region fixed inset-x-0 top-0 z-[70] h-8" />
      <div className="no-drag fixed right-2 top-2 z-[80] flex items-center gap-1">
        <button
          onClick={() => ctl.minimize()}
          aria-label="Minimize"
          className="grid size-7 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/15"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none">
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={() => ctl.close()}
          aria-label="Close"
          className="grid size-7 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-[#e5484d] hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none">
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </>
  )
}
