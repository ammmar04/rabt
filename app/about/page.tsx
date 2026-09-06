import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Rabt",
  description:
    "Rabt is a shared wardrobe of formal clothing on campus, built around dignity, privacy and shared ownership.",
};

const ARROW = (
  <svg width="20" height="8" viewBox="0 0 20 8" fill="none" stroke="currentColor" strokeWidth="1.3">
    <path d="M0 4h18M15 1l3 3-3 3" />
  </svg>
);

export default function About() {
  return (
    <>
      <section className="wrap page-head">
        <span className="label label--olive">About</span>
        <h1 style={{ marginTop: "1rem" }}>A wardrobe that belongs to everyone who uses it.</h1>
        <p className="lead">
          Rabt started from a simple observation: a lot of people need formal clothes
          occasionally, almost nobody needs them often, and buying a suit for one interview
          is a strange thing to ask of someone.
        </p>
      </section>

      <section className="wrap section--tight">
        <div className="split">
          <div className="split__media reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/scene/about.svg" alt="Pieces from the Rabt wardrobe" width={1200} height={800} loading="lazy" />
          </div>
          <div className="split__body reveal" data-d={1}>
            <span className="label">How we think about it</span>
            <h2 style={{ marginTop: ".6rem" }}>A service, not a favour.</h2>
            <p>
              The easiest way to make borrowing feel uncomfortable is to make someone prove
              they deserve it. So Rabt does not ask. There is no eligibility test, no means
              check, no form explaining your situation, and no word like
              &ldquo;beneficiary&rdquo; anywhere in it.
            </p>
            <p>
              You browse a rail, pick something, choose a time, and collect it. The same
              experience for everyone, because that is the only version that actually works.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap section--tight">
        <div className="split split--flip">
          <div className="split__media reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/scene/contribute.svg" alt="Clothing contributed to Rabt" width={1200} height={800} loading="lazy" />
          </div>
          <div className="split__body reveal" data-d={1}>
            <span className="label">Where it comes from</span>
            <h2 style={{ marginTop: ".6rem" }}>Shared, not donated.</h2>
            <p>
              Everything on the rail was passed on by someone on campus — a blazer outgrown,
              a suit worn once, a shirt that never got used. It stays in circulation instead
              of a cupboard.
            </p>
            <p>
              That is also why the wardrobe is not anyone&rsquo;s property. It is maintained
              by whoever is running Rabt this year, and built to keep working when they hand
              it on.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap wrap--mid section--tight">
        <div className="head reveal">
          <span className="label">Privacy</span>
          <h2>What we keep, and what we do not.</h2>
          <p>
            We ask for one thing: a way to reach you about your borrowing. Not your student
            ID, not your financial situation, not a reason. There are no public lists of who
            has borrowed what, and there never will be.
          </p>
        </div>
        <Link className="tlink reveal" href="/privacy" style={{ marginTop: "1.2rem" }}>
          Read the privacy note {ARROW}
        </Link>
      </section>

      <section className="wrap section--tight center">
        <div className="reveal" style={{ maxWidth: "40rem", marginInline: "auto" }}>
          <h2>Have a look at what is on the rail.</h2>
          <div className="btn-row" style={{ justifyContent: "center", marginTop: "1.6rem" }}>
            <Link className="btn btn--primary btn--lg" href="/catalogue">Browse the wardrobe</Link>
            <Link className="btn btn--ghost btn--lg" href="/contribute">Contribute something</Link>
          </div>
        </div>
      </section>
    </>
  );
}
