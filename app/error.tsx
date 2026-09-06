"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <section className="wrap section center">
      <div style={{ maxWidth: "36rem", marginInline: "auto" }}>
        <span className="label label--olive">Something went wrong</span>
        <h1 style={{ marginTop: "1rem" }}>That didn&rsquo;t load.</h1>
        <p className="lead" style={{ marginTop: "1rem" }}>
          Give it another go in a moment. If it keeps happening, the wardrobe team
          will want to know.
        </p>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: "1.8rem" }}>
          <button className="btn btn--primary" onClick={reset}>Try again</button>
          <Link className="btn btn--ghost" href="/">Go home</Link>
        </div>
        {error.digest && (
          <p className="muted" style={{ fontSize: "var(--fs-micro)", marginTop: "1.6rem" }}>
            Reference: {error.digest}
          </p>
        )}
      </div>
    </section>
  );
}
