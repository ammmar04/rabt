import Link from "next/link";
import { counts, getRequests } from "@/lib/queries";
import { dbKind } from "@/lib/db";
import { blobConfigured } from "@/lib/storage";
import { niceDate, STATUS_FLOW } from "@/lib/types";
import StatusSelect from "@/components/admin/StatusSelect";
import { updateRequest } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminRequests() {
  const [requests, c, kind] = await Promise.all([getRequests(), counts(), dbKind()]);
  const out = c.total - c.available;

  return (
    <>
      <div className="stat-row" style={{ marginBottom: "2rem" }}>
        <div className="stat"><div className="stat__n">{c.total}</div><div className="stat__l">Items in wardrobe</div></div>
        <div className="stat"><div className="stat__n">{c.available}</div><div className="stat__l">Available</div></div>
        <div className="stat"><div className="stat__n">{out}</div><div className="stat__l">Out or in cleaning</div></div>
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

      <div className="label label--rule" style={{ margin: "0 0 1rem" }}>Incoming requests</div>

      {requests.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Ref</th><th>Item</th><th>Name</th><th>Size</th><th>Requested</th>
                <th>Contact via</th><th>Details</th><th>Contribution</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.ref}>
                  <td>{r.ref}</td>
                  <td>
                    {r.item_id ? (
                      <Link href={`/item/${r.item_id}`} className="tlink" style={{ border: 0 }}>
                        {r.item_name}
                      </Link>
                    ) : r.item_name}
                  </td>
                  <td>{r.person_name || <span className="muted">—</span>}</td>
                  <td>{r.size}</td>
                  <td>{niceDate(r.requested_date)}, {r.requested_time}</td>
                  <td>{r.contact_method}</td>
                  <td>{r.contact_value}</td>
                  <td>{r.contribution}</td>
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
