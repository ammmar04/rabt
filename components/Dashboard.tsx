"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lookupRequests } from "@/app/actions";
import { myRefs } from "@/lib/refs";
import { dueLabel, itemTitle, niceDate, STATUS_FLOW, STATUS_RETURNED, type Request } from "@/lib/types";

type Tab = "current" | "previous" | "all";

function Track({ status }: { status: number }) {
  return (
    <>
      <div className="track">
        {STATUS_FLOW.map((_, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span className="track__dot" data-on={i <= status ? 1 : 0} />
            {i < STATUS_FLOW.length - 1 && <span className="track__line" data-on={i < status ? 1 : 0} />}
          </span>
        ))}
      </div>
      <div className="track-labels">
        <span>Requested</span><span>Ready</span><span>Returned</span>
      </div>
    </>
  );
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
    return <p className="muted">Loading your borrowing…</p>;
  }

  const done = STATUS_RETURNED;
  const current = rows.filter((r) => r.status < done);
  const previous = rows.filter((r) => r.status >= done);
  const shown = tab === "current" ? current : tab === "previous" ? previous : rows;

  return (
    <>
      <p className="lead" style={{ marginBottom: "2rem" }}>
        You have <strong>{current.length}</strong> active request{current.length === 1 ? "" : "s"}.
        Only you can see this — it is tied to this browser.
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
          {shown.map((r) => (
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
                    <div className="bcard__m">
                      Collect {niceDate(r.requested_date)}, {r.requested_time}
                    </div>
                    {r.return_date && r.status < done && (
                      <div className="bcard__m">
                        Return by {niceDate(r.return_date)}
                        {r.return_time ? `, ${r.return_time}` : ""} &middot; {dueLabel(r.return_date)}
                      </div>
                    )}
                  </div>
                  <span className="tag">{r.ref}</span>
                </div>
                <Track status={r.status} />
                <div className="bcard__foot">
                  <span className="badge badge--available" style={{ borderColor: "var(--olive-line)" }}>
                    {STATUS_FLOW[r.status] ?? "Request received"}
                  </span>
                  {r.item_id && (
                    <Link className="tlink" href={`/item/${r.item_id}`} style={{ marginLeft: "auto" }}>
                      View item
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="blank">
          <p>{tab === "previous" ? "Nothing returned yet." : "You haven't borrowed anything yet."}</p>
          <Link className="btn btn--primary" style={{ marginTop: "1.3rem" }} href="/catalogue">
            Browse the wardrobe
          </Link>
        </div>
      )}
    </>
  );
}
