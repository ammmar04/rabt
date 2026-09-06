import Link from "next/link";
import { getCategories, getItems } from "@/lib/queries";
import { STATUS_LABEL, parseSizes } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import StatusSelect from "@/components/admin/StatusSelect";
import { quickStatus, removeItem } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminItems() {
  const [items, categories] = await Promise.all([getItems(), getCategories()]);
  const catName = new Map(categories.map((c) => [c.slug, c.name]));

  return (
    <>
      <div className="admin-actions">
        <div className="label label--rule">Inventory &mdash; {items.length} item{items.length === 1 ? "" : "s"}</div>
        <Link className="btn btn--primary" href="/admin/items/new">Add item</Link>
      </div>

      {items.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th></th><th>ID</th><th>Item</th><th>Category</th><th>Sizes</th>
                <th>Colour</th><th>Status</th><th>Set availability</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="thumb" src={it.image_url} alt="" />
                  </td>
                  <td>{it.id}</td>
                  <td>
                    <Link href={`/admin/items/${it.id}`} className="tlink" style={{ border: 0 }}>
                      {it.name}
                    </Link>
                  </td>
                  <td>{catName.get(it.category) ?? it.category}</td>
                  <td>{parseSizes(it.sizes).join(", ")}</td>
                  <td>{it.colour}</td>
                  <td><StatusBadge status={it.status} availableFrom={it.available_from} /></td>
                  <td>
                    <StatusSelect
                      action={quickStatus}
                      hidden={{ id: it.id, available_from: it.available_from ?? "" }}
                      name="status"
                      value={it.status}
                      options={(["available", "borrowed", "soon"] as const).map((v) => ({
                        value: v, label: STATUS_LABEL[v],
                      }))}
                      width={150}
                    />
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
              ))}
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
