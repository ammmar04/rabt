"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveItem } from "@/app/admin/actions";
import { SIZE_OPTIONS, parseSizes, type Category, type Item } from "@/lib/types";

function PhotoField({
  name, label, hint, existing,
}: {
  name: string; label: string; hint: string; existing?: string;
}) {
  const [preview, setPreview] = useState<string | null>(existing || null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function take(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    if (input.current && files) input.current.files = files;
  }

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div
        className="drop"
        data-over={over ? "1" : "0"}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
        onClick={() => input.current?.click()}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="drop__preview" src={preview} alt="" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="2" />
            <path d="M21 16l-5-5-6 6-3-3-4 4" />
          </svg>
        )}
        <span className="drop__text">
          {preview ? "Click or drop to replace" : "Click to choose, or drag a photo here"}
        </span>
      </div>
      <input
        ref={input}
        id={name}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
        hidden
        onChange={(e) => take(e.target.files)}
      />
      <span className="hint">{hint}</span>
    </div>
  );
}

export default function ItemForm({
  categories,
  item,
}: {
  categories: Category[];
  item?: Item;
}) {
  const [state, action, pending] = useActionState(saveItem, {} as { error?: string });
  const [status, setStatus] = useState(item?.status ?? "available");
  const chosen = new Set(parseSizes(item?.sizes ?? ""));

  return (
    <form action={action} className="admin-form">
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className="admin-form__grid">
        <div>
          <PhotoField
            name="photo"
            label="Photo"
            hint="The main image shoppers see. Portrait works best (roughly 4:5). Max 8 MB."
            existing={item?.image_url}
          />
          <PhotoField
            name="photo2"
            label="Second photo (optional)"
            hint="A close-up of the fabric or a detail, shown as a second thumbnail."
            existing={item?.detail_url}
          />
        </div>

        <div>
          <div className="field">
            <label htmlFor="name">Item name</label>
            <input className="input" id="name" name="name" required
              defaultValue={item?.name} placeholder="Navy Single-Breasted Suit" />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select className="select" id="category" name="category" required defaultValue={item?.category ?? ""}>
                <option value="">Choose one</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="type">Type shown on the page</label>
              <input className="input" id="type" name="type" defaultValue={item?.type} placeholder="Two-piece suit" />
            </div>
          </div>

          <div className="field">
            <span className="field__label">Sizes available</span>
            <div className="checkrow">
              {SIZE_OPTIONS.map((s) => (
                <label className="checkchip" key={s}>
                  <input type="checkbox" name="sizes" value={s} defaultChecked={chosen.has(s)} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
            <span className="hint">Tick every size you have of this piece.</span>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="colour">Colour</label>
              <input className="input" id="colour" name="colour" defaultValue={item?.colour} placeholder="Navy" />
            </div>
            <div className="field">
              <label htmlFor="colour_hex">Colour swatch</label>
              <input className="input input--colour" id="colour_hex" name="colour_hex"
                type="color" defaultValue={item?.colour_hex || "#2C3A54"} />
              <span className="hint">Used for the colour filter dot.</span>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="fit">Fit</label>
              <input className="input" id="fit" name="fit" defaultValue={item?.fit} placeholder="Regular" />
            </div>
            <div className="field">
              <label htmlFor="condition">Condition</label>
              <input className="input" id="condition" name="condition" defaultValue={item?.condition} placeholder="Excellent" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="status">Availability</label>
              <select className="select" id="status" name="status" value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="available">Available</option>
                <option value="borrowed">Currently borrowed</option>
                <option value="soon">Available soon</option>
              </select>
            </div>
            {status !== "available" && (
              <div className="field">
                <label htmlFor="available_from">Back on</label>
                <input className="input" id="available_from" name="available_from" type="date"
                  defaultValue={item?.available_from ?? ""} />
                <span className="hint">Shown as &ldquo;From 14 Sept&rdquo; on the card.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea className="input" id="description" name="description" rows={3}
          defaultValue={item?.description}
          placeholder="A quiet navy two-piece that works for interviews and anything with a dress code." />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="measurements">Measurements</label>
          <textarea className="input" id="measurements" name="measurements" rows={5}
            defaultValue={item?.measurements}
            placeholder={"Chest: 38–42 in\nShoulder: 17.5 in\nSleeve: 24 in"} />
          <span className="hint">One per line, as <code>Label: value</code>.</span>
        </div>
        <div className="field">
          <label htmlFor="care">Care note</label>
          <textarea className="input" id="care" name="care" rows={5}
            defaultValue={item?.care} placeholder="Dry cleaned before every borrowing." />
        </div>
      </div>

      {state?.error && <div className="note note--brass">{state.error}</div>}

      <div className="btn-row" style={{ justifyContent: "space-between", marginTop: "1.6rem" }}>
        <Link className="btn btn--quiet" href="/admin/items">Cancel</Link>
        <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
          {pending ? "Saving…" : item ? "Save changes" : "Add to the wardrobe"}
        </button>
      </div>
    </form>
  );
}
