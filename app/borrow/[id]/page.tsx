import Link from "next/link";
import type { Metadata } from "next";
import { getItem, getPageCopy, getSettings } from "@/lib/queries";
import BorrowFlow, { type BorrowCopy } from "@/components/BorrowFlow";
import { itemStatus } from "@/lib/types";

const COPY_KEYS: (keyof BorrowCopy)[] = [
  "when_heading", "when_intro", "slot_note", "contact_heading", "contact_intro",
  "contribute_heading", "contribute_lead", "contribute_body", "send_notice",
  "done_heading", "done_body", "done_after",
];

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Borrow — Rabt",
  description: "Request an item from the Rabt wardrobe in three short steps.",
};

export default async function BorrowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, settings, c] = await Promise.all([getItem(id), getSettings(), getPageCopy("borrowing")]);

  if (!item || item.archived || !itemStatus(item.status).borrowable) {
    return (
      <section className="wrap wrap--narrow section--tight">
        <div className="blank">
          <p>
            {item && !item.archived && item.status === "on_hold"
              ? "Someone has already requested this piece, so it is being held for them."
              : "That item isn’t available to borrow right now."}
          </p>
          <Link className="btn btn--ghost" style={{ marginTop: "1.2rem" }} href="/catalogue">
            Back to the catalogue
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="wrap wrap--narrow section--tight">
      <BorrowFlow
        item={item}
        settings={settings}
        copy={Object.fromEntries(COPY_KEYS.map((k) => [k, c.t(k)])) as BorrowCopy}
      />
    </section>
  );
}
