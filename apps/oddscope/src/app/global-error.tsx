"use client";

/**
 * The last-resort boundary: it replaces the root layout, so it has to render
 * its own html and body and cannot use anything from the design system that
 * depends on the font variables the layout sets.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#0D1524",
          color: "#F1F5F9",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
            Something went badly wrong
          </h1>
          {error.digest ? (
            <p style={{ color: "#94A3B8", fontSize: "12px", marginTop: "8px" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <p style={{ color: "#94A3B8", fontSize: "14px", lineHeight: 1.6, marginTop: "8px" }}>
            OddScope failed to load. Reload the page, and if it keeps happening let us know.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "24px",
              minHeight: "48px",
              padding: "0 24px",
              background: "#2563EB",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
