import Link from "next/link";
import type { Metadata } from "next";
import { getPageCopy, getSettings } from "@/lib/queries";
import { waDigits } from "@/lib/validate";
import Steps from "@/components/Steps";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About — Rabt",
  description:
    "Rabt is a community initiative on campus built around sharing. Its first initiative is a shared wardrobe of professional attire, free to borrow.",
};

const ARROW = (
  <svg width="20" height="8" viewBox="0 0 20 8" fill="none" stroke="currentColor" strokeWidth="1.3">
    <path d="M0 4h18M15 1l3 3-3 3" />
  </svg>
);

export default async function About() {
  const [c, s] = await Promise.all([getPageCopy("about"), getSettings()]);
  const wa = waDigits(s.whatsapp ?? "");
  const email = s.email?.trim();

  return (
    <>
      <section className="wrap page-head">
        <span className="label label--olive">{c.t("eyebrow")}</span>
        <h1 style={{ marginTop: "1rem" }}>{c.t("heading")}</h1>
        {c.paras("lead").map((p, i) => <p className="lead" key={i}>{p}</p>)}
      </section>

      {/* Rabt as a whole, before any one initiative. */}
      <section className="wrap wrap--mid section--tight">
        <div className="head reveal">
          <span className="label">{c.t("intro_eyebrow")}</span>
          <h2>{c.t("intro_heading")}</h2>
        </div>
        <div className="prose reveal" data-d={1}>
          {c.paras("intro_body").map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </section>

      <section className="wrap section--tight">
        <div className="split">
          <div className="split__media reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/scene/about.svg" alt="Pieces from the Rabt wardrobe" width={1200} height={800} loading="lazy" />
          </div>
          <div className="split__body reveal" data-d={1}>
            <span className="label">{c.t("first_eyebrow")}</span>
            <h2 style={{ marginTop: ".6rem" }}>{c.t("first_heading")}</h2>
            {c.paras("first_body").map((p, i) => <p key={i}>{p}</p>)}
            <Link className="tlink" href="/how-it-works" style={{ marginTop: ".4rem" }}>
              How borrowing works {ARROW}
            </Link>
          </div>
        </div>
      </section>

      <section className="section--tight">
        <div className="wrap head reveal" style={{ marginBottom: "1.6rem" }}>
          <span className="label">{c.t("values_eyebrow")}</span>
          <h2>{c.t("values_heading")}</h2>
        </div>
        <Steps steps={c.list("values")} numbered={false} />
      </section>

      <section className="wrap wrap--mid section--tight">
        <div className="head reveal">
          <span className="label">{c.t("next_eyebrow")}</span>
          <h2>{c.t("next_heading")}</h2>
        </div>
        <div className="prose reveal" data-d={1}>
          {c.paras("next_body").map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {(wa || email) && (
          <div className="btn-row reveal" style={{ marginTop: "1.4rem" }}>
            {wa && (
              <a className="btn btn--ghost" href={`https://wa.me/${wa}`} target="_blank" rel="noopener">
                Message us on WhatsApp
              </a>
            )}
            {email && <a className="btn btn--ghost" href={`mailto:${email}`}>Email us</a>}
          </div>
        )}
      </section>

      <section className="wrap section--tight center">
        <div className="reveal" style={{ maxWidth: "40rem", marginInline: "auto" }}>
          <h2>{c.t("cta_heading")}</h2>
          <div className="btn-row" style={{ justifyContent: "center", marginTop: "1.6rem" }}>
            <Link className="btn btn--primary btn--lg" href="/catalogue">Browse the wardrobe</Link>
            <Link className="btn btn--ghost btn--lg" href="/contribute">Contribute something</Link>
          </div>
        </div>
      </section>
    </>
  );
}
