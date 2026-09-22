import Link from "next/link";
import type { Metadata } from "next";
import Steps from "@/components/Steps";
import { getPageCopy } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How it works — Rabt",
  description: "How borrowing from Rabt works: browse, request, confirm and collect, return.",
};

export default async function HowItWorks() {
  const c = await getPageCopy("how-it-works");
  const faqs = c.list("faqs");

  return (
    <>
      <section className="wrap page-head">
        <span className="label label--olive">{c.t("eyebrow")}</span>
        <h1 style={{ marginTop: "1rem" }}>{c.t("heading")}</h1>
        {c.paras("lead").map((p, i) => <p className="lead" key={i}>{p}</p>)}
      </section>

      <section className="section--tight"><Steps steps={c.list("steps")} /></section>

      <section className="wrap wrap--mid section--tight">
        {faqs.length > 0 && (
          <>
            <div className="head reveal" style={{ marginBottom: "1rem" }}>
              <span className="label">{c.t("faq_eyebrow")}</span>
              <h2>{c.t("faq_heading")}</h2>
            </div>
            {faqs.map((f, i) => (
              <div className="pdp__block reveal" key={`${i}-${f.title}`}>
                <h3 style={{ fontFamily: "var(--sans)", fontSize: "var(--fs-h5)", fontWeight: 700, letterSpacing: 0 }}>{f.title}</h3>
                <p className="muted" style={{ marginTop: ".5rem", maxWidth: "60ch" }}>{f.body}</p>
              </div>
            ))}
          </>
        )}
        {c.t("note") && (
          <div className="note reveal" style={{ marginTop: "2rem" }}>{c.t("note")}</div>
        )}
        <div className="center" style={{ marginTop: "2.4rem" }}>
          <Link className="btn btn--primary btn--lg" href="/catalogue">Browse the wardrobe</Link>
        </div>
      </section>
    </>
  );
}
