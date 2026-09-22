import type { Metadata } from "next";
import { getCategories, getItems, getPageCopy } from "@/lib/queries";
import CatalogueBrowser from "@/components/CatalogueBrowser";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue — Rabt",
  description:
    "Browse the Rabt wardrobe: suits, blazers, collared shirts and formal trousers. Filter by type, size, colour and availability.",
};

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [items, categories, c] = await Promise.all([
    getItems(), getCategories(), getPageCopy("catalogue"),
  ]);
  const valid = categories.some((x) => x.slug === category) ? category : undefined;

  return (
    <>
      <section className="wrap page-head page-head--tight">
        {c.t("eyebrow") && <span className="label label--olive">{c.t("eyebrow")}</span>}
        <h1 style={{ marginTop: "1rem" }}>{c.t("heading")}</h1>
        {c.t("intro") && <p className="lead">{c.t("intro")}</p>}
      </section>
      <section className="wrap section--tight">
        <CatalogueBrowser
          items={items}
          categories={categories}
          initialCategory={valid}
          emptyText={c.t("empty")}
        />
      </section>
    </>
  );
}
