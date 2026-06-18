import type { ReactNode } from "react"

/** A hardware phone shell: bezel, dynamic island, side buttons. */
export function PhoneFrame({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      {/* side buttons */}
      <div className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-white/15" />
      <div className="absolute -left-[3px] top-40 h-12 w-[3px] rounded-l bg-white/15" />
      <div className="absolute -left-[3px] top-56 h-12 w-[3px] rounded-l bg-white/15" />
      <div className="absolute -right-[3px] top-44 h-16 w-[3px] rounded-r bg-white/15" />

      <div className="relative w-[300px] rounded-[3rem] bg-[#0a0a12] p-[11px] shadow-[0_50px_140px_-30px_rgba(0,0,0,0.85)] ring-1 ring-white/10 sm:w-[330px]">
        {/* subtle bezel highlight */}
        <div className="pointer-events-none absolute inset-0 rounded-[3rem] ring-1 ring-inset ring-white/5" />

        <div className="relative aspect-[9/19.5] w-full overflow-hidden rounded-[2.35rem] bg-black">
          {children}

          {/* dynamic island */}
          <div className="absolute left-1/2 top-3 z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black/90 ring-1 ring-white/5">
            <div className="absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white/15" />
          </div>

          {/* home indicator */}
          <div className="absolute bottom-2 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  )
}
