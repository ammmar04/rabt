"use client";

import Link from "next/link";
import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { itemTitle, parseMeasurements, niceDate, type Item } from "@/lib/types";

export default function ItemDetail({
  item,
  categoryName,
}: {
  item: Item;
  categoryName: string;
}) {
  const gallery = [item.image_url, item.detail_url].filter(Boolean);
  const [shown, setShown] = useState(gallery[0] || "");
  const [helpOpen, setHelpOpen] = useState(false);

  const out = item.status !== "available";

  return (
    <div className="pdp">
      <div className="pdp__gallery reveal">
        <div className="pdp__main">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt={item.name} width={800} height={1000} />
        </div>
        {gallery.length > 1 && (
          <div className="pdp__thumbs">
            {gallery.map((src) => (
              <button
                key={src}
                className="pdp__thumb"
                aria-current={src === shown}
                aria-label="View image"
                onClick={() => setShown(src)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" width={200} height={250} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pdp__info reveal" data-d={1}>
        <div className="pdp__head">
          <span className="tag">{item.id}</span>
          <StatusBadge status={item.status} availableFrom={item.available_from} />
        </div>
        <h1>{itemTitle(item)}</h1>
        {item.description && <p className="lead">{item.description}</p>}

        {item.size && (
          <div className="pdp__block" style={{ marginTop: "1.4rem" }}>
            <div className="pdp__blockhead">
              <span className="label">Size</span>
              <button className="helper" type="button" onClick={() => setHelpOpen((v) => !v)}>
                Will this size fit?
              </button>
            </div>
            {/* One garment, one size — other sizes are their own listings. */}
            <div className="sizes">
              <span className="size size--fixed">{item.size}</span>
            </div>
            <p className="muted" style={{ fontSize: "var(--fs-small)", marginTop: ".7rem" }}>
              This is the only size of this piece.{" "}
              <Link className="tlink" href={`/catalogue?category=${item.category}`}>
                See other sizes and pieces
              </Link>
            </p>
            {helpOpen && (
              <div className="note" style={{ marginTop: ".9rem" }}>
                Measure a shirt or jacket you already own flat across the chest, double it,
                and compare it with the chest measurement below. If it is close, it will
                usually do — and you can ask us when we confirm your request.
              </div>
            )}
          </div>
        )}

        <div className="pdp__block">
          <div className="pdp__blockhead"><span className="label">Details</span></div>
          <div className="spec">
            {item.type && <div><span className="k">Type</span><span className="v">{item.type}</span></div>}
            {item.size && <div><span className="k">Size</span><span className="v">{item.size}</span></div>}
            {item.colour && <div><span className="k">Colour</span><span className="v">{item.colour}</span></div>}
            {item.fit && <div><span className="k">Fit</span><span className="v">{item.fit}</span></div>}
            {item.condition && <div><span className="k">Condition</span><span className="v">{item.condition}</span></div>}
            {parseMeasurements(item.measurements).map(([k, v]) => (
              <div key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
            ))}
          </div>
        </div>

        {item.care && (
          <div className="pdp__block">
            <div className="pdp__blockhead"><span className="label">Care</span></div>
            <p className="muted" style={{ fontSize: "var(--fs-small)" }}>{item.care}</p>
          </div>
        )}

        <div className="pdp__block">
          {out ? (
            <>
              <div className="note note--brass">
                This one is out at the moment
                {item.available_from ? <>, expected back around <strong>{niceDate(item.available_from)}</strong></> : null}
                . Have a look at what else is on the rail — or check back shortly.
              </div>
              <Link
                className="btn btn--ghost btn--block btn--lg"
                style={{ marginTop: "1rem" }}
                href={`/catalogue?category=${item.category}`}
              >
                Browse other {categoryName.toLowerCase()}
              </Link>
            </>
          ) : (
            <>
              <Link className="btn btn--primary btn--block btn--lg" href={`/borrow/${item.id}`}>
                Borrow this
              </Link>
              <p className="muted" style={{ fontSize: "var(--fs-small)", marginTop: ".8rem", textAlign: "center" }}>
                Free to borrow. No eligibility check, no forms about why you need it.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
