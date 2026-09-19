import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { itemTitle, type Item } from "@/lib/types";

export default function ItemCard({
  item,
  typeLabel,
  delay,
  reveal = true,
}: {
  item: Item;
  typeLabel?: string;
  delay?: number;
  /**
   * Scroll-reveal is for static page sections. Grids that re-render as the
   * viewer filters pass `false`, so results appear the moment they match
   * instead of waiting on an observer that never saw them.
   */
  reveal?: boolean;
}) {
  const out = item.status !== "available";
  const title = itemTitle(item);
  return (
    <article
      className={`item${reveal ? " reveal" : ""}${out ? " item--out" : ""}`}
      data-d={reveal ? delay : undefined}
    >
      <div className="item__media">
        <span className="tag item__tag">{item.id}</span>
        <span className="item__status">
          <StatusBadge status={item.status} availableFrom={item.available_from} />
        </span>
        <Link href={`/item/${item.id}`} aria-label={`View ${title}`}>
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
        {item.size && (
          <div className="item__sizes">
            <span>Size {item.size}</span>
          </div>
        )}
      </div>
    </article>
  );
}
