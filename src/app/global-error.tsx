"use client"

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
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
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Prism couldn&apos;t start</h1>
        <p style={{ maxWidth: 320, opacity: 0.7, margin: 0, lineHeight: 1.5 }}>
          An unexpected error occurred. Tap reload to try again.
        </p>
        <button
          onClick={() => {
            reset()
            if (typeof window !== "undefined") window.location.reload()
          }}
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
      </body>
    </html>
  )
}
