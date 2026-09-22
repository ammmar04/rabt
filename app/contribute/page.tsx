import type { Metadata } from "next";
import { getPageCopy, getSettings } from "@/lib/queries";
import { waDigits } from "@/lib/validate";
import Steps from "@/components/Steps";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contribute — Rabt",
  description: "Contribute formal clothing to the Rabt wardrobe.",
};

export default async function Contribute() {
  const [s, c] = await Promise.all([getSettings(), getPageCopy("contribute")]);
  const wa = waDigits(s.whatsapp ?? "");
  const email = s.email?.trim();

  return (
    <>
      <section className="wrap page-head">
        <span className="label label--olive">{c.t("eyebrow")}</span>
        <h1 style={{ marginTop: "1rem" }}>{c.t("heading")}</h1>
        {c.paras("lead").map((p, i) => <p className="lead" key={i}>{p}</p>)}
        <div className="btn-row" style={{ marginTop: "1.8rem" }}>
          <a className="btn btn--primary btn--lg" href="#hand-over">How to hand it over</a>
        </div>
      </section>

      <section className="section--tight">
        <div className="wrap head reveal" style={{ marginBottom: "1.4rem" }}>
          <span className="label">{c.t("takes_eyebrow")}</span>
          <h2>{c.t("takes_heading")}</h2>
        </div>
        <Steps steps={c.list("takes")} numbered={false} />
      </section>

      <section className="wrap wrap--mid section--tight" id="hand-over" style={{ scrollMarginTop: "100px" }}>
        <div className="head reveal">
          <span className="label">{c.t("handover_eyebrow")}</span>
          <h2>{c.t("handover_heading")}</h2>
        </div>
        <div className="reveal" style={{ marginTop: "1.6rem", display: "grid", gap: "1rem" }}>
          {c.list("handover").map((h, i) => (
            <div className="note" key={`${i}-${h.title}`}>
              <strong>{i + 1}. {h.title}</strong><br />
              {h.body}
            </div>
          ))}
        </div>

        <div className="contrib reveal" style={{ marginTop: "2rem" }}>
          <span className="label">{c.t("contact_label")}</span>
          {wa || email ? (
            <div className="btn-row" style={{ marginTop: "1rem" }}>
              {wa && (
                <a className="btn btn--primary" href={`https://wa.me/${wa}`} target="_blank" rel="noopener">
                  Message on WhatsApp
                </a>
              )}
              {email && <a className="btn btn--ghost" href={`mailto:${email}`}>Email us</a>}
            </div>
          ) : (
            <p style={{ marginTop: ".7rem" }}>{c.t("contact_missing")}</p>
          )}
          {c.t("money_note") && (
            <p className="muted" style={{ fontSize: "var(--fs-small)", marginTop: "1rem" }}>
              {c.t("money_note")}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
