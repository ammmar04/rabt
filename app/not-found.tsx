import Link from "next/link";

export default function NotFound() {
  return (
    <section className="wrap section center">
      <div style={{ maxWidth: "34rem", marginInline: "auto" }}>
        <span className="label label--olive">Not found</span>
        <h1 style={{ marginTop: "1rem" }}>That page isn&rsquo;t here.</h1>
        <p className="lead" style={{ marginTop: "1rem" }}>
          The link may be old, or the item may have left the wardrobe.
        </p>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: "1.8rem" }}>
          <Link className="btn btn--primary" href="/catalogue">Browse the wardrobe</Link>
          <Link className="btn btn--ghost" href="/">Go home</Link>
        </div>
      </div>
    </section>
  );
}
