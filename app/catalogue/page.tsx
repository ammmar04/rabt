import type { Metadata } from "next";
import { getCategories, getContent, getItems } from "@/lib/queries";
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
  const [items, categories, content] = await Promise.all([
    getItems(), getCategories(), getContent(),
  ]);
  const valid = categories.some((c) => c.slug === category) ? category : undefined;

  return (
    <>
      <section className="wrap page-head page-head--tight">
        {content.cat_eyebrow && <span className="label label--olive">{content.cat_eyebrow}</span>}
        <h1 style={{ marginTop: "1rem" }}>{content.cat_heading}</h1>
        {content.cat_intro && <p className="lead">{content.cat_intro}</p>}
      </section>
      <section className="wrap section--tight">
        <CatalogueBrowser
          items={items}
          categories={categories}
          initialCategory={valid}
          content={content}
        />
      </section>
    </>
  );
}
