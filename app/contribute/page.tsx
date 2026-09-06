import type { Metadata } from "next";
import { getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contribute — Rabt",
  description: "Contribute formal clothing to the Rabt wardrobe.",
};

const TAKES: [string, string][] = [
  ["Suits", "Two- or three-piece, any conventional colour."],
  ["Blazers", "Standalone jackets get borrowed constantly."],
  ["Collared shirts", "Especially white and light blue, all sizes."],
  ["Formal trousers", "Flat-front or pleated, hemmed or unhemmed."],
];

export default async function Contribute() {
  const s = await getSettings();
  const wa = s.whatsapp?.trim();
  const email = s.email?.trim();

  return (
    <>
      <section className="wrap page-head">
        <span className="label label--olive">Contribute</span>
        <h1 style={{ marginTop: "1rem" }}>Have something worth sharing?</h1>
        <p className="lead">
          If it is clean, in good condition and someone would be glad to wear it to an
          interview, it belongs on the rail.
        </p>
        <div className="btn-row" style={{ marginTop: "1.8rem" }}>
          <a className="btn btn--primary btn--lg" href="#hand-over">How to hand it over</a>
        </div>
      </section>

      <section className="section--tight">
        <div className="wrap head reveal" style={{ marginBottom: "1.4rem" }}>
          <span className="label">What gets used most</span>
          <h2>Things we are always short of.</h2>
        </div>
        <div className="steps">
          {TAKES.map(([t, d], i) => (
            <div className="hstep reveal" data-d={(i % 4) + 1} key={t}>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap wrap--mid section--tight" id="hand-over" style={{ scrollMarginTop: "100px" }}>
        <div className="head reveal">
          <span className="label">Handing it over</span>
          <h2>Three things, then it is done.</h2>
        </div>
        <div className="reveal" style={{ marginTop: "1.6rem", display: "grid", gap: "1rem" }}>
          <div className="note">
            <strong>1. Message us</strong><br />
            Tell us roughly what you have and the size. A photo helps but is not necessary.
          </div>
          <div className="note">
            <strong>2. We agree a time</strong><br />
            Somewhere on campus that suits you. It takes a minute.
          </div>
          <div className="note">
            <strong>3. We take it from there</strong><br />
            We clean it, measure it, photograph it and add it to the rail. If it turns out
            not to be usable we will pass it on somewhere it will be.
          </div>
        </div>

        <div className="contrib reveal" style={{ marginTop: "2rem" }}>
          <span className="label">Get in touch</span>
          {wa || email ? (
            <div className="btn-row" style={{ marginTop: "1rem" }}>
              {wa && (
                <a className="btn btn--primary" href={`https://wa.me/${wa.replace(/\D/g, "")}`} target="_blank" rel="noopener">
                  Message on WhatsApp
                </a>
              )}
              {email && <a className="btn btn--ghost" href={`mailto:${email}`}>Email us</a>}
            </div>
          ) : (
            <p style={{ marginTop: ".7rem" }}>
              Contact details are being set up — check back shortly, or reach out to the Rabt
              team on campus.
            </p>
          )}
          <p className="muted" style={{ fontSize: "var(--fs-small)", marginTop: "1rem" }}>
            Not able to contribute clothing? Contributions towards cleaning and repairs are
            just as useful, and entirely optional at every step.
          </p>
        </div>
      </section>
    </>
  );
}
