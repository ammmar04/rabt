"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F7F4ED", color: "#23241F", margin: 0 }}>
        <div style={{ maxWidth: "34rem", margin: "18vh auto", padding: "0 1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.8rem", marginBottom: ".8rem" }}>Rabt is briefly unavailable.</h1>
          <p style={{ color: "#4C4E45", lineHeight: 1.6 }}>
            Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.6rem", background: "#5B6B41", color: "#FBFAF6", border: 0,
              padding: "0.9em 1.7em", borderRadius: 3, fontWeight: 700, cursor: "pointer",
              textTransform: "uppercase", letterSpacing: ".09em", fontSize: ".82rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
