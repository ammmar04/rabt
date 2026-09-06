import Link from "next/link";
import { getCategories, getItems } from "@/lib/queries";
import ItemCard from "@/components/ItemCard";
import Steps from "@/components/Steps";

export const dynamic = "force-dynamic";

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default async function Home() {
  const [categories, items] = await Promise.all([getCategories(), getItems()]);
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
        <div className="wrap hero__in">
          <span className="label label--olive">The campus wardrobe</span>
          <h1>Borrow what you need.</h1>
          <p className="lead">
            Formal clothing for interviews, presentations, defences and anything with a
            dress code. Free to borrow, open to everyone — no eligibility check, no
            explaining why.
          </p>
          <div className="btn-row">
            <Link className="btn btn--primary btn--lg" href="/catalogue">Browse the wardrobe</Link>
            <Link className="btn btn--ghost btn--lg" href="/how-it-works">How it works</Link>
          </div>
          <div className="hero__meta">
            <span>{CHECK}Free to borrow</span>
            <span>{CHECK}No forms about why you need it</span>
            <span>{CHECK}<strong>&nbsp;{available.length}</strong>&nbsp;pieces available now</span>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="head reveal" style={{ marginBottom: "clamp(1.6rem,3vw,2.4rem)" }}>
          <span className="label">Browse by</span>
          <h2>Start with what you need.</h2>
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
          <span className="label">On the rail</span>
          <h2>Available right now.</h2>
        </div>
        {featured.length ? (
          <div className="items items--4">
            {featured.map((it, i) => (
              <ItemCard key={it.id} item={it} typeLabel={byCat.get(it.category)?.singular} delay={(i % 4) + 1} />
            ))}
          </div>
        ) : (
          <div className="blank"><p>Nothing on the rail just yet — check back shortly.</p></div>
        )}
        <div className="center" style={{ marginTop: "2.4rem" }}>
          <Link className="btn btn--ghost btn--lg" href="/catalogue">See the whole wardrobe</Link>
        </div>
      </section>

      <section className="section--tight">
        <div className="wrap head reveal" style={{ marginBottom: "1.6rem" }}>
          <span className="label">How it works</span>
          <h2>Four steps, and none of them awkward.</h2>
        </div>
        <Steps />
      </section>

      <section className="wrap section">
        <div className="split">
          <div className="split__media reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/scene/about.svg" alt="Clothing from the Rabt wardrobe" width={1200} height={800} loading="lazy" />
          </div>
          <div className="split__body reveal" data-d={1}>
            <span className="label">The idea</span>
            <h2 style={{ marginTop: ".6rem" }}>A wardrobe nobody owns.</h2>
            <p>
              Most of us need formal clothes a handful of times a year. Buying a suit for
              one interview rarely makes sense, and borrowing from a friend depends on
              having a friend your size.
            </p>
            <p>
              Rabt is the in-between: a shared rail that anyone on campus can use, kept
              going by people passing on things they no longer wear. You borrow it, you
              return it, someone else borrows it next.
            </p>
            <Link className="tlink" href="/about" style={{ marginTop: ".4rem" }}>
              More about Rabt
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
            <span className="label">Contribute</span>
            <h2 style={{ marginTop: ".6rem" }}>Have something worth sharing?</h2>
            <p>
              A blazer that no longer fits, a shirt you have not worn in two years, a suit
              from a wedding. If it is clean and in good condition, it will get used.
            </p>
            <div className="btn-row" style={{ marginTop: "1.4rem" }}>
              <Link className="btn btn--primary" href="/contribute">How to contribute</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
