"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lookupRequests } from "@/app/actions";
import { myRefs } from "@/lib/refs";
import {
  REQUEST_STATUSES, dueLabel, formatDay, itemTitle, niceDate, requestLabel,
  type Request, type RequestStatus,
} from "@/lib/types";

type Tab = "current" | "previous" | "all";

const TRACK: { status: RequestStatus; label: string }[] = [
  { status: "pending", label: "Requested" },
  { status: "confirmed", label: "Confirmed" },
  { status: "collected", label: "Borrowed" },
  { status: "returned", label: "Returned" },
];

function Track({ status }: { status: RequestStatus }) {
  const at = TRACK.findIndex((t) => t.status === status);
  return (
    <>
      <div className="track">
        {TRACK.map((t, i) => (
          <span key={t.status} style={{ display: "contents" }}>
            <span className="track__dot" data-on={i <= at ? 1 : 0} />
            {i < TRACK.length - 1 && <span className="track__line" data-on={i < at ? 1 : 0} />}
          </span>
        ))}
      </div>
      <div className="track-labels">
        {TRACK.map((t) => <span key={t.status}>{t.label}</span>)}
      </div>
    </>
  );
}

/** What the borrower should know about where their request is. */
function StatusLine({ r }: { r: Request }) {
  if (r.status === "pending") {
    return <>Not confirmed yet — we&rsquo;ll contact you to confirm it.</>;
  }
  if (r.status === "confirmed") {
    return <>Confirmed. Collect {niceDate(r.requested_date)}, {r.requested_time}, or when we arranged.</>;
  }
  if (r.status === "collected") {
    return r.due_date
      ? <>Return by {niceDate(r.due_date)}{r.due_time ? `, ${r.due_time}` : ""} &middot; {dueLabel(r.due_date)}</>
      : <>With you now. We&rsquo;ll agree the return date with you.</>;
  }
  if (r.status === "returned") return <>Returned {formatDay(r.returned_at ?? r.closed_at)}. Thank you.</>;
  if (r.status === "cancelled") return <>This request was cancelled.</>;
  return <>This request didn&rsquo;t go ahead. Have a look at what else is on the rail.</>;
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("current");
  const [rows, setRows] = useState<Request[] | null>(null);

  useEffect(() => {
    const refs = myRefs();
    if (!refs.length) { setRows([]); return; }
    lookupRequests(refs).then(setRows).catch(() => setRows([]));
  }, []);

  if (rows === null) {
    return <p className="muted">Loading your requests…</p>;
  }

  const current = rows.filter((r) => REQUEST_STATUSES[r.status]?.open);
  const previous = rows.filter((r) => !REQUEST_STATUSES[r.status]?.open);
  const shown = tab === "current" ? current : tab === "previous" ? previous : rows;

  return (
    <>
      <p className="lead" style={{ marginBottom: "2rem" }}>
        You have <strong>{current.length}</strong> active request{current.length === 1 ? "" : "s"}.
        Requests sent from this browser appear here.
      </p>

      <div className="tabs" role="tablist">
        {(["current", "previous", "all"] as Tab[]).map((t) => (
          <button
            key={t}
            className="tab"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "current" ? "Current" : t === "previous" ? "Previous" : "All requests"}
          </button>
        ))}
      </div>

      {shown.length ? (
        <div className="dash-grid">
          {shown.map((r) => {
            const closed = r.status === "cancelled" || r.status === "rejected";
            return (
              <article className="bcard" key={r.ref}>
                <div className="bcard__media">
                  {r.item_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.item_image} alt="" />
                  ) : null}
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", alignItems: "flex-start" }}>
                    <div>
                      <div className="bcard__t">{itemTitle({ name: r.item_name, size: r.size })}</div>
                      <div className="bcard__m">Requested {formatDay(r.created_at)}</div>
                      <div className="bcard__m"><StatusLine r={r} /></div>
                    </div>
                    <span className="tag">{r.ref}</span>
                  </div>
                  {!closed && <Track status={r.status} />}
                  <div className="bcard__foot">
                    <span
                      className={`badge ${closed ? "badge--plain" : r.status === "pending" ? "badge--soon" : "badge--available"}`}
                      style={closed ? undefined : { borderColor: "var(--olive-line)" }}
                    >
                      {requestLabel(r.status)}
                    </span>
                    {r.item_id && (
                      <Link className="tlink" href={`/item/${r.item_id}`} style={{ marginLeft: "auto" }}>
                        View item
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="blank">
          <p>{tab === "previous" ? "Nothing here yet." : "You haven't requested anything yet."}</p>
          <Link className="btn btn--primary" style={{ marginTop: "1.3rem" }} href="/catalogue">
            Browse the wardrobe
          </Link>
        </div>
      )}
    </>
  );
}
