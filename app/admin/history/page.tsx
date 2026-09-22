import Link from "next/link";
import { getItemLendCounts, getLendingHistory, getRequestHistory } from "@/lib/queries";
import { monthly, reasons, summarise } from "@/lib/history";
import {
  REQUEST_STATUSES, daysBetween, formatDateTime, formatDay, itemStatus, itemTitle,
  niceDate, requestLabel, siteDateOf, siteToday, type RequestStatus,
} from "@/lib/types";
import { formatPhone } from "@/lib/validate";
import MonthlyColumns, { ReasonBars } from "@/components/admin/MonthlyColumns";
import RemoveDetailsButton from "@/components/admin/RemoveDetailsButton";

export const dynamic = "force-dynamic";

const LOG_LIMIT = 300;

const STATUS_BADGE: Record<RequestStatus, string> = {
  pending: "badge badge--soon",
  confirmed: "badge badge--available",
  collected: "badge badge--available",
  returned: "badge badge--plain",
  cancelled: "badge badge--borrowed",
  rejected: "badge badge--borrowed",
};

export default async function AdminHistory({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && sp.status in REQUEST_STATUSES ? sp.status : "";
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : "";

  const [allRequests, lendings, perItem, log] = await Promise.all([
    getRequestHistory(),
    getLendingHistory(),
    getItemLendCounts(),
    getRequestHistory({ status: status || undefined, month: month || undefined, limit: LOG_LIMIT + 1 }),
  ]);

  const s = summarise(allRequests, lendings);
  const months = monthly(allRequests, lendings);
  const chartMonths = months.slice(0, 12).reverse();
  const chartMax = Math.max(...chartMonths.map((m) => Math.max(m.requests, m.lends)));
  const why = reasons(allRequests);
  const today = siteToday();
  const filtered = Boolean(status || month);

  return (
    <>
      <div className="admin-actions">
        <div className="label label--rule">Request &amp; Lending History</div>
        <div className="btn-row">
          <a className="btn btn--quiet btn--sm" href="/admin/history/export?type=requests" download>Download requests (CSV)</a>
          <a className="btn btn--quiet btn--sm" href="/admin/history/export?type=lendings" download>Download lendings (CSV)</a>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "var(--fs-small)", maxWidth: "74ch", marginBottom: "1.6rem" }}>
        Every request and every lending since the wardrobe opened — open, finished, cancelled
        or unfulfilled. Nothing here is typed in: the figures are counted from the records
        each time this page loads, and a garment&rsquo;s current status never changes its past
        lendings.
      </p>

      <div className="stat-row stat-row--6" style={{ marginBottom: "1rem" }}>
        <div className="stat"><div className="stat__n">{s.totalRequests}</div><div className="stat__l">Total requests</div></div>
        <div className="stat"><div className="stat__n">{s.fulfilled}</div><div className="stat__l">Fulfilled</div></div>
        <div className="stat"><div className="stat__n">{s.cancelled}</div><div className="stat__l">Cancelled</div></div>
        <div className="stat"><div className="stat__n">{s.rejected}</div><div className="stat__l">Rejected / unfulfilled</div></div>
        <div className="stat"><div className="stat__n">{s.totalLends}</div><div className="stat__l">Total lends</div></div>
        <div className="stat"><div className="stat__n">{s.inCirculation}</div><div className="stat__l">Items in circulation</div></div>
      </div>
      <dl className="facts" style={{ marginBottom: "2.4rem" }}>
        <div><dt>Awaiting confirmation or pickup</dt><dd>{s.open}</dd></div>
        <div><dt>Fulfilment rate</dt><dd>{s.fulfilmentRate === null ? "—" : `${s.fulfilmentRate}%`}</dd></div>
        <div><dt>Different garments lent</dt><dd>{s.garmentsLent}</dd></div>
        <div><dt>Average loan</dt><dd>{s.avgLoanDays === null ? "—" : `${s.avgLoanDays} days`}</dd></div>
        <div><dt>Returned late</dt><dd>{s.returnedLate}</dd></div>
        <div><dt>Overdue right now</dt><dd>{s.overdueNow}</dd></div>
      </dl>
      <p className="muted" style={{ fontSize: "var(--fs-micro)", marginTop: "-1.8rem", marginBottom: "2.4rem" }}>
        Items in circulation are garments out on loan right now. Fulfilled counts requests
        that were handed over; the fulfilment rate compares them with cancelled and
        unfulfilled requests.
      </p>

      <section className="hist-sec">
        <div className="label label--rule">By month</div>
        <div className="mc-pair">
          <MonthlyColumns title="Requests received" rows={chartMonths} pick={(m) => m.requests}
            unit={["request", "requests"]} max={chartMax} />
          <MonthlyColumns title="Garments lent" rows={chartMonths} pick={(m) => m.lends}
            unit={["lend", "lends"]} max={chartMax} />
        </div>
        <div className="tbl-wrap">
          <table className="tbl tbl--num">
            <thead>
              <tr><th>Month</th><th>Requests</th><th>Lent</th><th>Returned</th><th>Cancelled</th><th>Unfulfilled</th></tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <td>{m.label}</td><td>{m.requests}</td><td>{m.lends}</td><td>{m.returns}</td>
                  <td>{m.cancelled}</td><td>{m.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hist-sec">
        <div className="label label--rule">Why requests didn&rsquo;t go ahead</div>
        <div className="reason-pair">
          <div>
            <h3 className="admin-sub">Cancelled &middot; {s.cancelled}</h3>
            <ReasonBars rows={why.cancelled} empty="No cancelled requests." />
          </div>
          <div>
            <h3 className="admin-sub">Unfulfilled &middot; {s.rejected}</h3>
            <ReasonBars rows={why.rejected} empty="No unfulfilled requests." />
          </div>
        </div>
      </section>

      <section className="hist-sec">
        <div className="label label--rule">Lends per garment</div>
        <div className="tbl-wrap tbl-wrap--tall">
          <table className="tbl">
            <thead>
              <tr><th>ID</th><th>Garment</th><th>Times lent</th><th>Last lent</th><th>Status now</th></tr>
            </thead>
            <tbody>
              {perItem.map((it) => (
                <tr key={it.id}>
                  <td>{it.id}</td>
                  <td className="td--title">
                    {itemTitle({ name: it.name, size: it.size })}
                    {it.archived && <div className="tbl__sub">Removed from the wardrobe</div>}
                  </td>
                  <td className="num">{it.lends}</td>
                  <td>{it.last_lent ? formatDay(it.last_lent) : <span className="muted">Never</span>}</td>
                  <td>{it.archived ? <span className="muted">Removed</span> : itemStatus(it.status).label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hist-sec">
        <div className="label label--rule">Lending records &mdash; {lendings.length}</div>
        <p className="muted" style={{ fontSize: "var(--fs-small)", marginBottom: "1rem" }}>
          One row per handover. A garment lent three times has three rows.
        </p>
        {lendings.length ? (
          <div className="tbl-wrap tbl-wrap--tall">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Lent on</th><th>Garment</th><th>Borrower</th><th>Expected return</th>
                  <th>Returned</th><th>Days out</th>
                </tr>
              </thead>
              <tbody>
                {lendings.map((l) => {
                  const out = siteDateOf(l.lent_at) ?? today;
                  const home = siteDateOf(l.returned_at);
                  const late = l.due_date && (home ?? today) > l.due_date;
                  return (
                    <tr key={l.id}>
                      <td>{formatDateTime(l.lent_at)}</td>
                      <td className="td--title">
                        {itemTitle({ name: l.item_name, size: l.item_size })}
                        <div className="tbl__sub">{l.item_id}{l.request_ref ? ` · ${l.request_ref}` : ""}</div>
                      </td>
                      <td>{l.borrower_name || <span className="muted">&mdash;</span>}</td>
                      <td>{l.due_date ? `${niceDate(l.due_date)}${l.due_time ? `, ${l.due_time}` : ""}` : <span className="muted">Not set</span>}</td>
                      <td>
                        {home ? formatDateTime(l.returned_at) : <span className="badge badge--soon">Still out</span>}
                        {late && <div className="tbl__sub">{home ? "Back late" : "Overdue"}</div>}
                      </td>
                      <td className="num">{daysBetween(out, home ?? today)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="blank"><p>Nothing has been lent yet.</p></div>
        )}
      </section>

      <section className="hist-sec" id="requests">
        <div className="label label--rule">Request records</div>
        <form className="hist-filter" method="get" action="/admin/history#requests">
          <label>
            <span className="label">Status</span>
            <select className="select select--sm" name="status" defaultValue={status}>
              <option value="">All</option>
              {Object.entries(REQUEST_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Month received</span>
            <select className="select select--sm" name="month" defaultValue={month}>
              <option value="">Any time</option>
              {months.map((m) => <option key={m.month} value={m.month}>{m.label}</option>)}
            </select>
          </label>
          <button className="btn btn--quiet btn--sm" type="submit">Show</button>
          {filtered && <Link className="tlink" href="/admin/history#requests" style={{ border: 0 }}>Clear</Link>}
        </form>
        <p className="muted" style={{ fontSize: "var(--fs-small)", marginBottom: "1rem" }}>
          {log.length > LOG_LIMIT
            ? `Showing the latest ${LOG_LIMIT}. Narrow it down above, or download the CSV for everything.`
            : `${log.length} request${log.length === 1 ? "" : "s"}${filtered ? " match" : ""}.`}
        </p>
        {log.length ? (
          <div className="tbl-wrap tbl-wrap--tall">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Submitted</th><th>Garment</th><th>Requester</th><th>Status</th>
                  <th>Borrowing</th><th></th>
                </tr>
              </thead>
              <tbody>
                {log.slice(0, LOG_LIMIT).map((r) => (
                  <tr key={r.ref}>
                    <td>{formatDateTime(r.created_at)}<div className="tbl__sub">{r.ref}</div></td>
                    <td className="td--title">
                      {itemTitle({ name: r.item_name, size: r.size })}
                      <div className="tbl__sub">{r.item_id ?? "—"}</div>
                    </td>
                    <td className="td--wrap">
                      {r.person_name || <span className="muted">&mdash;</span>}
                      <div className="tbl__sub">
                        {r.contact_value
                          ? `${r.contact_method}: ${r.contact_method === "WhatsApp" ? formatPhone(r.contact_value) : r.contact_value}`
                          : "Contact removed"}
                      </div>
                    </td>
                    <td className="td--wrap">
                      <span className={STATUS_BADGE[r.status] ?? "badge badge--plain"}>{requestLabel(r.status)}</span>
                      {r.close_reason && <div className="tbl__sub">{r.close_reason}{r.close_note ? ` — ${r.close_note}` : ""}</div>}
                    </td>
                    <td className="td--wrap">
                      Collect {niceDate(r.requested_date)}, {r.requested_time}
                      {r.lent_at && (
                        <div className="tbl__sub">
                          Lent {formatDay(r.lent_at)} &middot; due {r.due_date ? niceDate(r.due_date) : "not set"}
                          {r.returned_at ? <> &middot; back {formatDay(r.returned_at)}</> : null}
                        </div>
                      )}
                    </td>
                    <td>{(r.person_name || r.contact_value) && !REQUEST_STATUSES[r.status]?.open
                      ? <RemoveDetailsButton requestRef={r.ref} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="blank"><p>{filtered ? "No requests match." : "No requests yet."}</p></div>
        )}
      </section>
    </>
  );
}
