import Link from "next/link";
import { getCategories, getItems, getPageCopy } from "@/lib/queries";
import ItemCard from "@/components/ItemCard";
import Steps from "@/components/Steps";

export const dynamic = "force-dynamic";

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default async function Home() {
  const [categories, items, c, how] = await Promise.all([
    getCategories(), getItems(), getPageCopy("home"), getPageCopy("how-it-works"),
  ]);
  const available = items.filter((i) => i.status === "available");
  const featured = available.slice(0, 8);
  const byCat = new Map(categories.map((c) => [c.slug, c]));

  return (
    <>
      <section className="hero">
        <div className="hero__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/hero.svg" alt="A rail of formal clothing from the Rabt wardrobe" width={1600} height={900} />
        </div>
        <div className="hero__scrim" />
        {/* Kept short on purpose: browsing the rail is the point of this
            screen, so the catalogue button stays within the first viewport on
            a phone. The longer explanation lives further down and on
            /how-it-works. */}
        <div className="wrap hero__in">
          <span className="label label--olive">{c.t("hero_eyebrow")}</span>
          <h1>{c.t("hero_heading")}</h1>
          <p className="lead">{c.t("hero_lead")}</p>
          <div className="btn-row">
            <Link className="btn btn--primary btn--lg" href="/catalogue">Browse the wardrobe</Link>
            <Link className="btn btn--ghost btn--lg" href="/how-it-works">How it works</Link>
          </div>
          <div className="hero__meta">
            <span>{CHECK}<strong>&nbsp;{available.length}</strong>&nbsp;pieces available now</span>
            {c.t("hero_point") && <span>{CHECK}{c.t("hero_point")}</span>}
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="head reveal" style={{ marginBottom: "clamp(1.6rem,3vw,2.4rem)" }}>
          <span className="label">{c.t("browse_eyebrow")}</span>
          <h2>{c.t("browse_heading")}</h2>
        </div>
        <div className="cat-grid">
          {categories.map((c, i) => {
            const n = items.filter((x) => x.category === c.slug).length;
            return (
              <Link className="cat reveal" data-d={(i % 4) + 1} key={c.slug} href={`/catalogue?category=${c.slug}`}>
                <div className="cat__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image} alt={c.name} width={1200} height={800} loading="lazy" />
                </div>
                <div className="cat__body">
                  <span className="cat__name">{c.name}</span>
                  <span className="cat__count">{n} item{n === 1 ? "" : "s"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="wrap section--tight">
        <div className="head reveal" style={{ marginBottom: "clamp(1.4rem,3vw,2rem)" }}>
          <span className="label">{c.t("featured_eyebrow")}</span>
          <h2>{c.t("featured_heading")}</h2>
        </div>
        {featured.length ? (
          <div className="items items--4">
            {featured.map((it, i) => (
              <ItemCard key={it.id} item={it} typeLabel={byCat.get(it.category)?.singular} delay={(i % 4) + 1} />
            ))}
          </div>
        ) : (
          <div className="blank"><p>{c.t("featured_empty")}</p></div>
        )}
        <div className="center" style={{ marginTop: "2.4rem" }}>
          <Link className="btn btn--ghost btn--lg" href="/catalogue">See the whole wardrobe</Link>
        </div>
      </section>

      <section className="section--tight">
        <div className="wrap head reveal" style={{ marginBottom: "1.6rem" }}>
          <span className="label">{c.t("steps_eyebrow")}</span>
          <h2>{c.t("steps_heading")}</h2>
        </div>
        <Steps steps={how.list("steps")} />
      </section>

      <section className="wrap section">
        <div className="split">
          <div className="split__media reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/scene/about.svg" alt="Clothing from the Rabt wardrobe" width={1200} height={800} loading="lazy" />
          </div>
          <div className="split__body reveal" data-d={1}>
            <span className="label">{c.t("idea_eyebrow")}</span>
            <h2 style={{ marginTop: ".6rem" }}>{c.t("idea_heading")}</h2>
            {c.paras("idea_body").map((p, i) => <p key={i}>{p}</p>)}
            <Link className="tlink" href="/about" style={{ marginTop: ".4rem" }}>
              {c.t("idea_link")}
              <svg width="20" height="8" viewBox="0 0 20 8" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M0 4h18M15 1l3 3-3 3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section className="wrap section--tight">
        <div className="split split--flip">
          <div className="split__media reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/scene/contribute.svg" alt="Formal clothing ready to be shared" width={1200} height={800} loading="lazy" />
          </div>
          <div className="split__body reveal" data-d={1}>
            <span className="label">{c.t("contribute_eyebrow")}</span>
            <h2 style={{ marginTop: ".6rem" }}>{c.t("contribute_heading")}</h2>
            {c.paras("contribute_body").map((p, i) => <p key={i}>{p}</p>)}
            <div className="btn-row" style={{ marginTop: "1.4rem" }}>
              <Link className="btn btn--primary" href="/contribute">How to contribute</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
