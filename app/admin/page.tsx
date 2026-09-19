import Link from "next/link";
import { counts, getRequests } from "@/lib/queries";
import { dbKind } from "@/lib/db";
import { blobConfigured } from "@/lib/storage";
import { STATUS_FLOW, itemTitle, niceDate } from "@/lib/types";
import StatusSelect from "@/components/admin/StatusSelect";
import ReturnDueForm from "@/components/admin/ReturnDueForm";
import { updateRequest } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminRequests() {
  const [requests, c, kind] = await Promise.all([getRequests(), counts(), dbKind()]);

  return (
    <>
      <div className="stat-row" style={{ marginBottom: "2rem" }}>
        <div className="stat"><div className="stat__n">{c.total}</div><div className="stat__l">Garments in wardrobe</div></div>
        <div className="stat"><div className="stat__n">{c.available}</div><div className="stat__l">Available</div></div>
        <div className="stat"><div className="stat__n">{c.out}</div><div className="stat__l">Out or in cleaning</div></div>
        <div className="stat"><div className="stat__n">{c.open}</div><div className="stat__l">Open requests</div></div>
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

      <div className="label label--rule" style={{ margin: "0 0 .6rem" }}>Incoming requests</div>
      <p className="muted" style={{ fontSize: "var(--fs-small)", marginBottom: "1.2rem", maxWidth: "70ch" }}>
        Borrowers pick a collection day only. Fill in <strong>Expected return</strong> when
        you hand the garment over &mdash; saving it marks the request as borrowed and starts
        tracking the return under{" "}
        <Link className="tlink" href="/admin/returns" style={{ border: 0 }}>Returns</Link>.
      </p>

      {requests.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Garment</th><th>Borrower</th><th>Collection</th><th>Contact</th>
                <th>Expected return</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.ref}>
                  <td className="td--title">
                    {r.item_id ? (
                      <Link href={`/item/${r.item_id}`} className="tlink" style={{ border: 0 }}>
                        {itemTitle({ name: r.item_name, size: r.size })}
                      </Link>
                    ) : itemTitle({ name: r.item_name, size: r.size })}
                    <div className="tbl__sub">{r.item_id ? `${r.item_id} · ` : ""}{r.ref}</div>
                  </td>
                  <td>
                    {r.person_name || <span className="muted">&mdash;</span>}
                    <div className="tbl__sub">{r.contribution}</div>
                  </td>
                  <td>{niceDate(r.requested_date)}, {r.requested_time}</td>
                  <td className="td--wrap">
                    {r.contact_method}
                    <div className="tbl__sub">{r.contact_value}</div>
                  </td>
                  <td>
                    <ReturnDueForm
                      requestRef={r.ref}
                      date={r.return_date}
                      time={r.return_time}
                      compact
                    />
                  </td>
                  <td>
                    <StatusSelect
                      action={updateRequest}
                      hidden={{ ref: r.ref }}
                      name="status"
                      value={r.status}
                      options={STATUS_FLOW.map((label, i) => ({ value: i, label }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="blank">
          <p>No requests yet. Ones made through the site appear here.</p>
        </div>
      )}
    </>
  );
}
