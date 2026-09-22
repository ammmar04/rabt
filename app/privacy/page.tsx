import type { Metadata } from "next";
import { getPageCopy } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy — Rabt",
  description: "What Rabt records when you borrow, and how it is used.",
};

export default async function Privacy() {
  const c = await getPageCopy("privacy");
  return (
    <>
      <section className="wrap page-head">
        <span className="label label--olive">{c.t("eyebrow")}</span>
        <h1 style={{ marginTop: "1rem" }}>{c.t("heading")}</h1>
        {c.paras("lead").map((p, i) => <p className="lead" key={i}>{p}</p>)}
      </section>
      <section className="wrap wrap--narrow section--tight">
        <div className="reveal" style={{ display: "grid", gap: "1.6rem" }}>
          {c.list("sections").map((s, i) => (
            <div key={`${i}-${s.title}`}>
              <h3 style={{ fontFamily: "var(--sans)", fontSize: "var(--fs-h5)", fontWeight: 700, letterSpacing: 0 }}>{s.title}</h3>
              <p className="muted" style={{ marginTop: ".5rem" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
