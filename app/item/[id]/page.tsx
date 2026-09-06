import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getItem, getItems } from "@/lib/queries";
import ItemDetail from "@/components/ItemDetail";
import ItemCard from "@/components/ItemCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) return { title: "Item — Rabt" };
  return {
    title: `${item.name} — Rabt`,
    description: item.description || `${item.name} from the Rabt wardrobe.`,
  };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item || item.archived) notFound();

  const [categories, all] = await Promise.all([getCategories(), getItems()]);
  const cat = categories.find((c) => c.slug === item.category);
  const related = all.filter((x) => x.category === item.category && x.id !== item.id).slice(0, 4);
  const singular = new Map(categories.map((c) => [c.slug, c.singular]));

  return (
    <div className="wrap section--tight">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/catalogue">Catalogue</Link> /{" "}
        <Link href={`/catalogue?category=${item.category}`}>{cat?.name ?? item.category}</Link> /{" "}
        <span>{item.name}</span>
      </nav>

      <ItemDetail item={item} categoryName={cat?.name ?? "items"} />

      {related.length > 0 && (
        <section className="section--tight" style={{ marginTop: "2rem" }}>
          <div className="label label--rule reveal" style={{ marginBottom: "1.4rem" }}>
            More {(cat?.name ?? "items").toLowerCase()}
          </div>
          <div className="items items--4">
            {related.map((r, i) => (
              <ItemCard key={r.id} item={r} typeLabel={singular.get(r.category)} delay={(i % 4) + 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
