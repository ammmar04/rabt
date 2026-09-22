import Link from "next/link";
import { getOpenLendings, getWaitingRequests } from "@/lib/queries";
import { DUE_SOON_DAYS, ago, groupReturns, itemTitle, needsAttention } from "@/lib/types";

/**
 * The reminder shown on every admin page: new requests waiting for a reply
 * (their garments are on hold meanwhile) and returns that are due or late.
 */
export default async function AttentionAlert() {
  const [lendings, waiting] = await Promise.all([getOpenLendings(), getWaitingRequests()]);
  const { overdue, today, soon, undated, total } = needsAttention(lendings);
  const pending = waiting.filter((r) => r.status === "pending");
  if (total === 0 && pending.length === 0) return null;

  const groups = groupReturns(lendings);
  const urgent = [...groups.overdue, ...groups.today].slice(0, 4);

  const parts: string[] = [];
  if (overdue) parts.push(`${overdue} overdue`);
  if (today) parts.push(`${today} due today`);
  if (soon) parts.push(`${soon} due within ${DUE_SOON_DAYS} days`);
  if (undated) parts.push(`${undated} without a return date`);

  return (
    <div className="attention" role="status">
      {pending.length > 0 && (
        <div className="note note--brass">
          <strong>{pending.length} request{pending.length === 1 ? "" : "s"} awaiting confirmation.</strong>{" "}
          The oldest came in {ago(pending[0].created_at)}, and its garment is on hold until you
          confirm or cancel it.{" "}
          <Link className="tlink" href="/admin">Open requests</Link>
        </div>
      )}
      {total > 0 && (
        <div className={`note ${overdue || today ? "note--brass" : ""}`}>
          <strong>Returns to keep an eye on.</strong> {parts.join(", ")}.
          {urgent.length > 0 && (
            <span>
              {" "}
              {urgent
                .map((l) => `${itemTitle({ name: l.item_name, size: l.item_size })} (${l.item_id})`)
                .join(", ")}
              {overdue + today > urgent.length ? " and more" : ""}.
            </span>
          )}{" "}
          <Link className="tlink" href="/admin/returns">Open returns</Link>
        </div>
      )}
    </div>
  );
}
