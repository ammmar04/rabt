import Link from "next/link";
import { getLendingsForReturns } from "@/lib/queries";
import {
  DUE_SOON_DAYS, dueLabel, formatDay, groupReturns, itemTitle, needsAttention,
  niceDate, siteDateOf, type Lending, type ReturnBucket,
} from "@/lib/types";
import { formatPhone } from "@/lib/validate";
import ReturnDueForm from "@/components/admin/ReturnDueForm";
import MarkReturnedButton from "@/components/admin/MarkReturnedButton";

export const dynamic = "force-dynamic";

const GROUPS: { key: ReturnBucket; title: string; hint: string }[] = [
  { key: "overdue", title: "Overdue", hint: "Past the agreed return date — worth a message." },
  { key: "today", title: "Due today", hint: "Expected back before the day is out." },
  { key: "soon", title: "Due soon", hint: `Coming back within ${DUE_SOON_DAYS} days.` },
  { key: "undated", title: "No return date yet", hint: "Handed over without a return agreed — add one." },
  { key: "scheduled", title: "Later", hint: "Out on loan, due further ahead." },
  { key: "returned", title: "Returned", hint: "Back in the last 30 days. Every lending stays in Request & Lending History." },
];

const DUE_BADGE: Record<ReturnBucket, string> = {
  overdue: "badge badge--borrowed",
  today: "badge badge--soon",
  soon: "badge badge--plain",
  scheduled: "badge badge--plain",
  undated: "badge badge--plain",
  returned: "badge badge--available",
};

function Row({ l, bucket }: { l: Lending; bucket: ReturnBucket }) {
  const done = bucket === "returned";
  const title = itemTitle({ name: l.item_name, size: l.item_size });
  const contact = l.contact_method === "WhatsApp" ? formatPhone(l.contact_value ?? "") : l.contact_value;
  return (
    <tr>
      <td className="td--title">
        <Link href={`/item/${l.item_id}`} className="tlink" style={{ border: 0 }}>{title}</Link>
        <div className="tbl__sub">{l.item_id}{l.request_ref ? ` · ${l.request_ref}` : ""}</div>
      </td>
      <td className="td--wrap">
        {l.borrower_name || <span className="muted">&mdash;</span>}
        <div className="tbl__sub">{contact ? `${l.contact_method}: ${contact}` : ""}</div>
      </td>
      <td>{formatDay(l.lent_at)}</td>
      <td>
        {done ? (
          l.due_date ? `${niceDate(l.due_date)}${l.due_time ? `, ${l.due_time}` : ""}` : <span className="muted">&mdash;</span>
        ) : (
          <ReturnDueForm lendingId={l.id} date={l.due_date} time={l.due_time} lentOn={siteDateOf(l.lent_at) ?? ""} />
        )}
      </td>
      <td>
        {done
          ? <span className={DUE_BADGE.returned}>Returned {formatDay(l.returned_at)}</span>
          : <span className={DUE_BADGE[bucket]}>{dueLabel(l.due_date)}</span>}
      </td>
      <td>{done ? null : <MarkReturnedButton lendingId={l.id} />}</td>
    </tr>
  );
}

export default async function AdminReturns() {
  const rows = await getLendingsForReturns();
  const groups = groupReturns(rows);
  const attention = needsAttention(rows);

  return (
    <>
      <div className="stat-row" style={{ marginBottom: "2rem" }}>
        <div className="stat"><div className="stat__n">{groups.overdue.length}</div><div className="stat__l">Overdue</div></div>
        <div className="stat"><div className="stat__n">{groups.today.length}</div><div className="stat__l">Due today</div></div>
        <div className="stat"><div className="stat__n">{groups.soon.length}</div><div className="stat__l">Due within {DUE_SOON_DAYS} days</div></div>
        <div className="stat"><div className="stat__n">{groups.undated.length}</div><div className="stat__l">Awaiting return date</div></div>
      </div>

      {attention.total === 0 && (
        <div className="note" style={{ marginBottom: "1.6rem" }}>
          <strong>Nothing needs chasing.</strong> No returns are overdue, due today or due
          in the next {DUE_SOON_DAYS} days.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="blank">
          <p>Nothing is out on loan. Hand a request over and it appears here.</p>
          <Link className="btn btn--primary" style={{ marginTop: "1.3rem" }} href="/admin">Go to requests</Link>
        </div>
      ) : (
        GROUPS.filter((g) => groups[g.key].length > 0).map((g) => (
          <section key={g.key} style={{ marginBottom: "2.2rem" }}>
            <div className="label label--rule" style={{ marginBottom: ".5rem" }}>
              {g.title} &mdash; {groups[g.key].length}
            </div>
            <p className="muted" style={{ fontSize: "var(--fs-small)", marginBottom: "1rem" }}>{g.hint}</p>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Garment</th><th>Borrower</th><th>Lent on</th><th>Expected return</th><th>Due</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {groups[g.key].map((l) => <Row key={l.id} l={l} bucket={g.key} />)}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </>
  );
}
