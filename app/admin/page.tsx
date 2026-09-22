import Link from "next/link";
import { counts, getWaitingRequests } from "@/lib/queries";
import { dbKind } from "@/lib/db";
import { blobConfigured } from "@/lib/storage";
import {
  ago, daysUntil, formatDateTime, fullDate, itemStatus, itemTitle, requestLabel,
  type Request,
} from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ContactLinks from "@/components/admin/ContactLinks";
import { CloseRequest, ConfirmButton, HandoverForm } from "@/components/admin/RequestActions";

export const dynamic = "force-dynamic";

function RequestCard({ r }: { r: Request }) {
  const title = itemTitle({ name: r.item_name, size: r.size });
  const heldHere = r.item_status === "on_hold" && r.item_hold_ref === r.ref;
  const collectIn = daysUntil(r.requested_date);

  return (
    <article className="rq">
      <header className="rq__head">
        <div>
          {r.item_id ? (
            <Link className="rq__title" href={`/item/${r.item_id}`}>{title}</Link>
          ) : <span className="rq__title">{title}</span>}
          <div className="rq__sub">
            {r.item_id && <span className="tag">{r.item_id}</span>}
            <span>Ref {r.ref}</span>
          </div>
        </div>
        <span className={`badge ${r.status === "pending" ? "badge--soon" : "badge--available"}`}>
          {requestLabel(r.status)}
        </span>
      </header>

      <dl className="rq__facts">
        <div>
          <dt>Submitted</dt>
          <dd>{formatDateTime(r.created_at)} <span className="muted">&middot; {ago(r.created_at)}</span></dd>
        </div>
        <div>
          <dt>Wants to collect</dt>
          <dd>
            {fullDate(r.requested_date)}, {r.requested_time}
            {collectIn !== null && collectIn < 0 && <span className="muted"> &middot; passed</span>}
          </dd>
        </div>
        {r.confirmed_at && (
          <div><dt>Confirmed</dt><dd>{formatDateTime(r.confirmed_at)}</dd></div>
        )}
        <div>
          <dt>Garment</dt>
          <dd>
            {r.item_status ? <StatusBadge status={r.item_status} /> : <span className="muted">Removed</span>}
            {r.item_status && !heldHere && (
              <span className="rq__warn">
                {" "}Not held for this request — it is {itemStatus(r.item_status).label.toLowerCase()} now.
              </span>
            )}
          </dd>
        </div>
        <div><dt>Contribution</dt><dd>{r.contribution || "—"}</dd></div>
      </dl>

      <div className="rq__who">
        <span className="label">Requested by</span>
        <div className="rq__name">{r.person_name || <span className="muted">No name given</span>}</div>
        <ContactLinks
          method={r.contact_method} value={r.contact_value} name={r.person_name}
          reference={r.ref} item={title}
        />
      </div>

      <div className="rq__actions">
        {r.status === "pending" && (
          <div className="rq__confirm">
            <ConfirmButton requestRef={r.ref} />
            <span className="hint">Once you&rsquo;ve confirmed it with them.</span>
          </div>
        )}
        <HandoverForm requestRef={r.ref} />
        <CloseRequest requestRef={r.ref} />
      </div>
    </article>
  );
}

export default async function AdminRequests() {
  const [waiting, c, kind] = await Promise.all([getWaitingRequests(), counts(), dbKind()]);
  const pending = waiting.filter((r) => r.status === "pending");
  const confirmed = waiting.filter((r) => r.status === "confirmed");

  return (
    <>
      <div className="stat-row" style={{ marginBottom: "2rem" }}>
        <div className="stat"><div className="stat__n">{pending.length}</div><div className="stat__l">Awaiting confirmation</div></div>
        <div className="stat"><div className="stat__n">{confirmed.length}</div><div className="stat__l">Confirmed, awaiting pickup</div></div>
        <div className="stat"><div className="stat__n">{c.lent}</div><div className="stat__l">Out on loan</div></div>
        <div className="stat"><div className="stat__n">{c.available}</div><div className="stat__l">Garments available</div></div>
      </div>

      {kind === "pglite" && (
        <div className="note note--brass" style={{ marginBottom: "1.6rem" }}>
          <strong>Local database.</strong> This is running on a throwaway database on your
          own machine. Add a Neon Postgres database in Vercel and set{" "}
          <code>DATABASE_URL</code> for the real thing.
        </div>
      )}
      {!blobConfigured() && (
        <div className="note note--brass" style={{ marginBottom: "1.6rem" }}>
          <strong>Photo storage not connected.</strong> Uploads are being written to a local
          folder. Add a Blob store in Vercel (Storage → Blob) before deploying, or photos
          will not save.
        </div>
      )}

      <p className="muted" style={{ fontSize: "var(--fs-small)", marginBottom: "1.6rem", maxWidth: "74ch" }}>
        A new request holds its garment straight away, so nobody else can request it.
        Contact the borrower to confirm, then record the handover with the return date you
        agree. Cancelling, or marking a request unfulfilled, puts the garment back on the
        rail. Closed requests stay in{" "}
        <Link className="tlink" href="/admin/history" style={{ border: 0 }}>Request &amp; Lending History</Link>.
      </p>

      {[
        { title: "Awaiting confirmation", rows: pending, empty: "No new requests." },
        { title: "Confirmed — awaiting pickup", rows: confirmed, empty: "Nothing confirmed and waiting to be collected." },
      ].map((g) => (
        <section key={g.title} style={{ marginBottom: "2.4rem" }}>
          <div className="label label--rule" style={{ margin: "0 0 1rem" }}>{g.title} &mdash; {g.rows.length}</div>
          {g.rows.length ? (
            <div className="rq-list">{g.rows.map((r) => <RequestCard key={r.ref} r={r} />)}</div>
          ) : (
            <div className="blank"><p>{g.empty}</p></div>
          )}
        </section>
      ))}
    </>
  );
}
