import Link from "next/link";
import { getBorrowings } from "@/lib/queries";
import { DUE_SOON_DAYS, groupReturns, itemTitle, needsAttention } from "@/lib/types";

/**
 * The reminder. Shown on every admin page so nobody has to remember which
 * garments are due back — overdue and same-day returns are named outright.
 */
export default async function ReturnsAlert() {
  const rows = await getBorrowings();
  const { overdue, today, soon, undated, total } = needsAttention(rows);
  if (total === 0) return null;

  const groups = groupReturns(rows);
  const urgent = [...groups.overdue, ...groups.today].slice(0, 4);

  const parts: string[] = [];
  if (overdue) parts.push(`${overdue} overdue`);
  if (today) parts.push(`${today} due today`);
  if (soon) parts.push(`${soon} due within ${DUE_SOON_DAYS} days`);
  if (undated) parts.push(`${undated} without a return date`);

  return (
    <div
      className={`note ${overdue || today ? "note--brass" : ""}`}
      role="status"
      style={{ marginBottom: "1.6rem" }}
    >
      <strong>Returns to keep an eye on.</strong> {parts.join(", ")}.
      {urgent.length > 0 && (
        <span>
          {" "}
          {urgent
            .map((r) => `${itemTitle({ name: r.item_name, size: r.size })} (${r.ref})`)
            .join(", ")}
          {overdue + today > urgent.length ? " and more" : ""}.
        </span>
      )}{" "}
      <Link className="tlink" href="/admin/returns" style={{ marginLeft: ".2rem" }}>
        Open returns
      </Link>
    </div>
  );
}
