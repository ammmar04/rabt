import type { Metadata } from "next";
import { getCategories, getItems } from "@/lib/queries";
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
  const [items, categories] = await Promise.all([getItems(), getCategories()]);
  const valid = categories.some((c) => c.slug === category) ? category : undefined;

  return (
    <>
      <section className="wrap page-head">
        <span className="label label--olive">The wardrobe</span>
        <h1 style={{ marginTop: "1rem" }}>Everything on the rail.</h1>
        <p className="lead">
          Borrow any of it, free. Items already out are still listed so you can see the
          full wardrobe and when they are due back.
        </p>
      </section>
      <section className="wrap section--tight">
        <CatalogueBrowser items={items} categories={categories} initialCategory={valid} />
      </section>
    </>
  );
}
