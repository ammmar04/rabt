"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveItem } from "@/app/admin/actions";
import { ITEM_STATUSES, SIZE_OPTIONS, itemStatus, type Category, type Item } from "@/lib/types";
import { checkPhoto, fromFormData, validateItem, type ActionState } from "@/lib/forms";
import FieldError from "@/components/FieldError";
import { useFormErrors } from "./useFormErrors";

function PhotoField({
  name, label, hint, existing, error,
}: {
  name: string; label: string; hint: string; existing?: string; error?: string;
}) {
  const [preview, setPreview] = useState<string | null>(existing || null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function take(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    if (input.current && files) {
      input.current.files = files;
      // Lets the form clear this field's message once a new photo is chosen.
      input.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div
        className="drop"
        data-over={over ? "1" : "0"}
        data-field={name}
        tabIndex={0}
        role="button"
        aria-invalid={Boolean(error)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
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
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
        hidden
        onChange={(e) => take(e.target.files)}
      />
      {error ? <FieldError message={error} /> : <span className="hint">{hint}</span>}
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
  const [state, action, pending] = useActionState(saveItem, {} as ActionState);
  const [status, setStatus] = useState<string>(item?.status ?? "available");
  const isNew = !item;

  const { errors, onSubmit, onInput } = useFormErrors(state.fields, (fd) => {
    const { errors: e } = validateItem(fromFormData(fd), {
      isNew, categories: categories.map((c) => c.slug),
    });
    const photo = checkPhoto(fd.get("photo") as File | null, { required: isNew });
    if (photo) e.photo = photo;
    const second = checkPhoto(fd.get("photo2") as File | null, { required: false });
    if (second) e.photo2 = second;
    return e;
  }, action);

  const err = (k: string) => ({
    "aria-invalid": Boolean(errors[k]),
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
  });

  const heldBy = item?.status === "on_hold" ? item.hold_ref : null;

  return (
    <form onSubmit={onSubmit} onInput={onInput} noValidate className="admin-form">
      {item && <input type="hidden" name="editing" value={item.id} />}

      <div className="admin-form__grid">
        <div>
          <PhotoField
            name="photo"
            label="Photo"
            hint="The main image people see. Portrait works best (roughly 4:5). JPG, PNG, WebP or HEIC, up to 8 MB."
            existing={item?.image_url}
            error={errors.photo}
          />
          <PhotoField
            name="photo2"
            label="Second photo (optional)"
            hint="A close-up of the fabric or a detail, shown as a second thumbnail."
            existing={item?.detail_url}
            error={errors.photo2}
          />
        </div>

        <div>
          {isNew ? (
            <div className="field">
              <label htmlFor="id">Item ID</label>
              <input className="input" id="id" name="id" required maxLength={24}
                autoComplete="off" spellCheck={false} placeholder="e.g. R-115" {...err("id")} />
              {errors.id
                ? <FieldError id="id-err" message={errors.id} />
                : <span className="hint">Your own number for this garment — usually the one on its tag. It can&rsquo;t be changed later, because its history is filed under it.</span>}
            </div>
          ) : (
            <div className="field">
              <span className="field__label">Item ID</span>
              <span className="id-fixed">{item.id}</span>
              <span className="hint">Fixed once added — requests and lending history are filed under it.</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="name">Item name</label>
            <input className="input" id="name" name="name" required maxLength={120}
              defaultValue={item?.name} placeholder="Navy Single-Breasted Suit" {...err("name")} />
            <FieldError id="name-err" message={errors.name} />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select className="select" id="category" name="category" required
                defaultValue={item?.category ?? ""} {...err("category")}>
                <option value="">Choose one</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <FieldError id="category-err" message={errors.category} />
            </div>
            <div className="field">
              <label htmlFor="type">Type shown on the page</label>
              <input className="input" id="type" name="type" maxLength={60}
                defaultValue={item?.type} placeholder="Two-piece suit" {...err("type")} />
              <FieldError id="type-err" message={errors.type} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="size">Size</label>
              <input className="input" id="size" name="size" required list="size-options" maxLength={20}
                defaultValue={item?.size} placeholder="M, or 40" {...err("size")} />
              <datalist id="size-options">
                {SIZE_OPTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
              {errors.size
                ? <FieldError id="size-err" message={errors.size} />
                : <span className="hint">One garment, one size. The same piece in another size is added as its own item.</span>}
            </div>
            <div className="field">
              <label htmlFor="fit">Fit</label>
              <input className="input" id="fit" name="fit" maxLength={40}
                defaultValue={item?.fit} placeholder="Regular" {...err("fit")} />
              <FieldError id="fit-err" message={errors.fit} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="colour">Colour</label>
              <input className="input" id="colour" name="colour" maxLength={40}
                defaultValue={item?.colour} placeholder="Navy" {...err("colour")} />
              <FieldError id="colour-err" message={errors.colour} />
            </div>
            <div className="field">
              <label htmlFor="colour_hex">Colour swatch</label>
              <input className="input input--colour" id="colour_hex" name="colour_hex"
                type="color" defaultValue={item?.colour_hex || "#2C3A54"} {...err("colour_hex")} />
              {errors.colour_hex
                ? <FieldError id="colour_hex-err" message={errors.colour_hex} />
                : <span className="hint">Used for the colour filter dot.</span>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="condition">Condition</label>
              <input className="input" id="condition" name="condition" maxLength={40}
                defaultValue={item?.condition} placeholder="Excellent" {...err("condition")} />
              <FieldError id="condition-err" message={errors.condition} />
            </div>
            <div className="field">
              <label htmlFor="status">Physical status</label>
              <select className="select" id="status" name="status" value={status}
                onChange={(e) => setStatus(e.target.value)} {...err("status")}>
                {ITEM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {errors.status
                ? <FieldError id="status-err" message={errors.status} />
                : heldBy && status === "on_hold"
                  ? <span className="hint">Held for request {heldBy}. Changing this releases that hold.</span>
                  : heldBy
                    ? <span className="hint">This releases the hold for request {heldBy}.</span>
                    : null}
            </div>
          </div>

          {itemStatus(status).hasReturnDate && (
            <div className="field">
              <label htmlFor="available_from">
                Back on <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <input className="input" id="available_from" name="available_from" type="date"
                defaultValue={item?.available_from ?? ""} {...err("available_from")} />
              {errors.available_from
                ? <FieldError id="available_from-err" message={errors.available_from} />
                : <span className="hint">Shown on the item page as when it should be back.</span>}
            </div>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea className="input" id="description" name="description" rows={3} maxLength={1500}
          defaultValue={item?.description} {...err("description")}
          placeholder="A quiet navy two-piece that works for interviews and anything with a dress code." />
        <FieldError id="description-err" message={errors.description} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="measurements">Measurements</label>
          <textarea className="input" id="measurements" name="measurements" rows={5} maxLength={1000}
            defaultValue={item?.measurements} {...err("measurements")}
            placeholder={"Chest: 38–42 in\nShoulder: 17.5 in\nSleeve: 24 in"} />
          {errors.measurements
            ? <FieldError id="measurements-err" message={errors.measurements} />
            : <span className="hint">One per line, as <code>Label: value</code>.</span>}
        </div>
        <div className="field">
          <label htmlFor="care">Care note</label>
          <textarea className="input" id="care" name="care" rows={5} maxLength={500}
            defaultValue={item?.care} placeholder="Dry cleaned before every borrowing." {...err("care")} />
          <FieldError id="care-err" message={errors.care} />
        </div>
      </div>

      {Object.keys(errors).length > 0 ? (
        <div className="note note--brass" role="alert">
          {Object.keys(errors).length === 1
            ? "One thing needs fixing before this can be saved — see the highlighted field."
            : `${Object.keys(errors).length} things need fixing before this can be saved — see the highlighted fields.`}
        </div>
      ) : state?.error ? (
        <div className="note note--brass" role="alert">{state.error}</div>
      ) : null}

      <div className="btn-row" style={{ justifyContent: "space-between", marginTop: "1.6rem" }}>
        <Link className="btn btn--quiet" href="/admin/items">Cancel</Link>
        <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
          {pending ? "Saving…" : item ? "Save changes" : "Add to the wardrobe"}
        </button>
      </div>
    </form>
  );
}
