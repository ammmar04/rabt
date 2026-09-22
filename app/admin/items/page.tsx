import Link from "next/link";
import { getCategories, getItems } from "@/lib/queries";
import { ITEM_STATUSES, itemStatus, niceDate } from "@/lib/types";
import StatusSelect from "@/components/admin/StatusSelect";
import { quickStatus, removeItem } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminItems() {
  const [items, categories] = await Promise.all([getItems(), getCategories()]);
  const catName = new Map(categories.map((c) => [c.slug, c.name]));

  return (
    <>
      <div className="admin-actions">
        <div className="label label--rule">
          Inventory &mdash; {items.length} garment{items.length === 1 ? "" : "s"}
        </div>
        <Link className="btn btn--primary" href="/admin/items/new">Add item</Link>
      </div>
      <p className="muted" style={{ fontSize: "var(--fs-small)", marginBottom: "1.2rem", maxWidth: "74ch" }}>
        <strong>Physical status</strong> is where each garment is right now. It changes by
        itself when a request holds it, when it is handed over and when it comes back — and
        you can set it here at any time. Changing it never touches requests or lending history.
      </p>

      {items.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th></th><th>ID</th><th>Item</th><th>Size</th><th>Colour</th>
                <th>Physical status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const s = itemStatus(it.status);
                const back = s.hasReturnDate && it.available_from ? `Back ${niceDate(it.available_from)}` : "";
                const held = it.status === "on_hold"
                  ? it.hold_ref ? `Held for ${it.hold_ref}` : "Held by hand, not by a request"
                  : "";
                return (
                  <tr key={it.id}>
                    <td>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="thumb" src={it.image_url} alt="" />
                    </td>
                    <td>{it.id}</td>
                    <td className="td--title">
                      <Link href={`/admin/items/${it.id}`} className="tlink" style={{ border: 0 }}>
                        {it.name}
                      </Link>
                      <div className="tbl__sub">{catName.get(it.category) ?? it.category}</div>
                    </td>
                    <td>{it.size || <span className="muted">&mdash;</span>}</td>
                    <td>{it.colour}</td>
                    <td>
                      <StatusSelect
                        action={quickStatus}
                        hidden={{ id: it.id }}
                        name="status"
                        value={it.status}
                        width={200}
                        options={ITEM_STATUSES.map((v) => ({ value: v.value, label: v.label }))}
                      />
                      {(held || back) && <div className="tbl__sub">{held || back}</div>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: ".4rem" }}>
                        <Link className="btn btn--quiet btn--sm" href={`/admin/items/${it.id}`}>Edit</Link>
                        <form action={removeItem}>
                          <input type="hidden" name="id" value={it.id} />
                          <button className="btn btn--quiet btn--sm btn--danger" type="submit">Remove</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="blank">
          <p>The wardrobe is empty.</p>
          <Link className="btn btn--primary" style={{ marginTop: "1.3rem" }} href="/admin/items/new">
            Add the first item
          </Link>
        </div>
      )}
    </>
  );
}
