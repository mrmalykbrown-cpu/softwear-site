"use client"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        background: "#0f0f23",
        color: "#f8fafc",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "linear-gradient(135deg,#6366f1,#4338ca)",
          display: "grid",
          placeItems: "center",
          fontSize: 28,
        }}
      >
        ✦
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Something went sideways</h1>
      <p style={{ maxWidth: 320, opacity: 0.7, margin: 0, lineHeight: 1.5 }}>
        Prism hit an unexpected error. Tap reload to try again.
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 8,
          padding: "12px 28px",
          borderRadius: 999,
          border: "none",
          background: "#6366f1",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        Reload
      </button>
    </div>
  )
}
