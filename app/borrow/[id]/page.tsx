import Link from "next/link";
import type { Metadata } from "next";
import { getItem, getSettings } from "@/lib/queries";
import BorrowFlow from "@/components/BorrowFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Borrow — Rabt",
  description: "Request an item from the Rabt wardrobe in four short steps.",
};

export default async function BorrowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, settings] = await Promise.all([getItem(id), getSettings()]);

  if (!item || item.archived || item.status !== "available") {
    return (
      <section className="wrap wrap--narrow section--tight">
        <div className="blank">
          <p>That item isn&rsquo;t available to borrow right now.</p>
          <Link className="btn btn--ghost" style={{ marginTop: "1.2rem" }} href="/catalogue">
            Back to the catalogue
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="wrap wrap--narrow section--tight">
      <BorrowFlow item={item} settings={settings} />
    </section>
  );
}
