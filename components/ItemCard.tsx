import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { parseSizes, type Item } from "@/lib/types";

export default function ItemCard({
  item,
  typeLabel,
  delay,
}: {
  item: Item;
  typeLabel?: string;
  delay?: number;
}) {
  const out = item.status !== "available";
  return (
    <article className={`item reveal${out ? " item--out" : ""}`} data-d={delay}>
      <div className="item__media">
        <span className="tag item__tag">{item.id}</span>
        <span className="item__status">
          <StatusBadge status={item.status} availableFrom={item.available_from} />
        </span>
        <Link href={`/item/${item.id}`} aria-label={`View ${item.name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url || "/img/items/placeholder.svg"}
            alt={item.name}
            width={800}
            height={1000}
            loading="lazy"
            decoding="async"
          />
        </Link>
        <div className="item__cta">
          <Link className="btn btn--sm btn--block" href={`/item/${item.id}`}>
            {out ? "View item" : "View / Borrow"}
          </Link>
        </div>
      </div>
      <div className="item__body">
        <Link href={`/item/${item.id}`}>
          <h3 className="item__name">{item.name}</h3>
        </Link>
        <div className="item__meta">
          <span>{typeLabel || item.type}</span>
          <span>{item.colour}</span>
        </div>
        <div className="item__sizes">
          {parseSizes(item.sizes).map((s) => <span key={s}>{s}</span>)}
        </div>
      </div>
    </article>
  );
}
