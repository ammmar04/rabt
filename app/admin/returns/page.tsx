import Link from "next/link";
import { getBorrowings } from "@/lib/queries";
import {
  DUE_SOON_DAYS, STATUS_FLOW, dueLabel, groupReturns, itemTitle, needsAttention,
  niceDate, type Request, type ReturnBucket,
} from "@/lib/types";
import ReturnDueForm from "@/components/admin/ReturnDueForm";
import MarkReturnedButton from "@/components/admin/MarkReturnedButton";

export const dynamic = "force-dynamic";

const GROUPS: { key: ReturnBucket; title: string; hint: string }[] = [
  { key: "overdue", title: "Overdue", hint: "Past the agreed return date — worth a message." },
  { key: "today", title: "Due today", hint: "Expected back before the day is out." },
  { key: "soon", title: "Due soon", hint: `Coming back within ${DUE_SOON_DAYS} days.` },
  { key: "undated", title: "No return date yet", hint: "Handed over without a return agreed — add one." },
  { key: "scheduled", title: "Later", hint: "Out on loan, due further ahead." },
  { key: "returned", title: "Returned", hint: "Back on the rail." },
];

const DUE_BADGE: Record<ReturnBucket, string> = {
  overdue: "badge badge--borrowed",
  today: "badge badge--soon",
  soon: "badge badge--plain",
  scheduled: "badge badge--plain",
  undated: "badge badge--plain",
  returned: "badge badge--available",
};

function Row({ r, bucket }: { r: Request; bucket: ReturnBucket }) {
  const done = bucket === "returned";
  return (
    <tr>
      <td className="td--title">
        {r.item_id ? (
          <Link href={`/item/${r.item_id}`} className="tlink" style={{ border: 0 }}>
            {itemTitle({ name: r.item_name, size: r.size })}
          </Link>
        ) : (
          itemTitle({ name: r.item_name, size: r.size })
        )}
        <div className="tbl__sub">{r.item_id ? `${r.item_id} · ` : ""}{r.ref}</div>
      </td>
      <td className="td--wrap">
        {r.person_name || <span className="muted">&mdash;</span>}
        <div className="tbl__sub">
          {r.contact_method ? `${r.contact_method}: ${r.contact_value}` : ""}
        </div>
      </td>
      <td>
        {done ? (
          r.return_date ? `${niceDate(r.return_date)}${r.return_time ? `, ${r.return_time}` : ""}`
                        : <span className="muted">&mdash;</span>
        ) : (
          <ReturnDueForm requestRef={r.ref} date={r.return_date} time={r.return_time} compact />
        )}
      </td>
      <td>
        {done ? (
          <span className={DUE_BADGE.returned}>
            Returned{r.returned_at ? ` ${niceDate(r.returned_at)}` : ""}
          </span>
        ) : (
          <>
            <span className={DUE_BADGE[bucket]}>{dueLabel(r.return_date)}</span>
            <div className="tbl__sub">{STATUS_FLOW[r.status] ?? "Borrowed"}</div>
          </>
        )}
      </td>
      <td>{done ? null : <MarkReturnedButton requestRef={r.ref} />}</td>
    </tr>
  );
}

export default async function AdminReturns() {
  const rows = await getBorrowings();
  const groups = groupReturns(rows);
  const attention = needsAttention(rows);

  // Most recent returns only: the full history lives on the Requests tab.
  groups.returned = groups.returned.slice(0, 15);

  return (
    <>
      <div className="stat-row" style={{ marginBottom: "2rem" }}>
        <div className="stat">
          <div className="stat__n">{groups.overdue.length}</div>
          <div className="stat__l">Overdue</div>
        </div>
        <div className="stat">
          <div className="stat__n">{groups.today.length}</div>
          <div className="stat__l">Due today</div>
        </div>
        <div className="stat">
          <div className="stat__n">{groups.soon.length}</div>
          <div className="stat__l">Due within {DUE_SOON_DAYS} days</div>
        </div>
        <div className="stat">
          <div className="stat__n">{groups.undated.length}</div>
          <div className="stat__l">Awaiting return date</div>
        </div>
      </div>

      {attention.total === 0 && (
        <div className="note" style={{ marginBottom: "1.6rem" }}>
          <strong>Nothing needs chasing.</strong> No returns are overdue, due today or due
          in the next {DUE_SOON_DAYS} days.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="blank">
          <p>Nothing has been handed over yet. Set a return date on a request and it appears here.</p>
          <Link className="btn btn--primary" style={{ marginTop: "1.3rem" }} href="/admin">
            Go to requests
          </Link>
        </div>
      ) : (
        GROUPS.filter((g) => groups[g.key].length > 0).map((g) => (
          <section key={g.key} style={{ marginBottom: "2.2rem" }}>
            <div className="label label--rule" style={{ marginBottom: ".5rem" }}>
              {g.title} &mdash; {groups[g.key].length}
            </div>
            <p className="muted" style={{ fontSize: "var(--fs-small)", marginBottom: "1rem" }}>
              {g.hint}
            </p>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Garment</th><th>Borrower</th><th>Expected return</th>
                    <th>Due</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {groups[g.key].map((r) => <Row key={r.ref} r={r} bucket={g.key} />)}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </>
  );
}
