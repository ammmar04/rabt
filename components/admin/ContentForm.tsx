"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateContent } from "@/app/admin/actions";
import {
  defaultValue, fieldsOf, findPage, parseList, storedKey, validatePage,
  type Field, type ListItem,
} from "@/lib/content";
import type { ActionState } from "@/lib/forms";
import FieldError from "@/components/FieldError";
import { useFormErrors } from "./useFormErrors";

type Values = Record<string, string>;

function ListEditor({
  field, value, onChange, error,
}: {
  field: Extract<Field, { kind: "list" }>;
  value: ListItem[];
  onChange: (next: ListItem[]) => void;
  error?: string;
}) {
  const set = (i: number, patch: Partial<ListItem>) =>
    onChange(value.map((it, n) => (n === i ? { ...it, ...patch } : it)));
  const move = (i: number, by: number) => {
    const next = [...value];
    const [it] = next.splice(i, 1);
    next.splice(i + by, 0, it);
    onChange(next);
  };

  return (
    <div className="list-ed" data-field={field.key} tabIndex={-1} aria-invalid={Boolean(error)}>
      {value.map((it, i) => (
        <div className="list-ed__row" key={i}>
          <span className="list-ed__n">{i + 1}</span>
          <div className="list-ed__fields">
            <input
              className="input"
              aria-label={`${field.titleLabel} ${i + 1}`}
              placeholder={field.titleLabel}
              maxLength={field.titleMax}
              value={it.title}
              onChange={(e) => set(i, { title: e.target.value })}
            />
            <textarea
              className="input"
              aria-label={`${field.bodyLabel} ${i + 1}`}
              placeholder={field.bodyLabel}
              maxLength={field.bodyMax}
              rows={2}
              value={it.body}
              onChange={(e) => set(i, { body: e.target.value })}
            />
          </div>
          <div className="list-ed__tools">
            <button type="button" className="btn btn--quiet btn--sm" disabled={i === 0}
              aria-label={`Move ${i + 1} up`} onClick={() => move(i, -1)}>↑</button>
            <button type="button" className="btn btn--quiet btn--sm" disabled={i === value.length - 1}
              aria-label={`Move ${i + 1} down`} onClick={() => move(i, 1)}>↓</button>
            <button type="button" className="btn btn--quiet btn--sm btn--danger"
              disabled={value.length <= field.minItems}
              aria-label={`Remove ${i + 1}`} onClick={() => onChange(value.filter((_, n) => n !== i))}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" disabled={value.length >= field.maxItems}
        onClick={() => onChange([...value, { title: "", body: "" }])}>
        Add {field.titleLabel.toLowerCase()}
      </button>
    </div>
  );
}

/** Edits one page's copy. Generated from the page's definition in lib/content.ts. */
export default function ContentForm({ page, stored }: { page: string; stored: Values }) {
  const def = findPage(page)!;
  const fields = fieldsOf(def);

  const initial = (f: Field) => stored[storedKey(page, f.key)] ?? defaultValue(f);
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(fields.map((f) => [f.key, initial(f)]))
  );
  const [state, action, pending] = useActionState(updateContent, {} as ActionState);
  const [savedAt, setSavedAt] = useState<ActionState | null>(null);

  const { errors, onSubmit, onInput } = useFormErrors(state.fields, (fd) =>
    validatePage(def, (k) => {
      const v = fd.get(k);
      return typeof v === "string" ? v : null;
    }).errors, action
  );

  const set = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setSavedAt(state);
  };
  const edited = (f: Field) => {
    const v = values[f.key];
    if (f.kind === "list") return JSON.stringify(parseList(v) ?? []) !== defaultValue(f);
    return v.trim() !== f.default;
  };
  // "Saved" only while nothing has been changed since the save.
  const justSaved = state.ok && savedAt !== state && !pending;

  return (
    <form onSubmit={onSubmit} onInput={onInput} noValidate className="admin-form content-form">
      <input type="hidden" name="page" value={page} />

      {def.sections.map((section) => (
        <fieldset className="content-sec" key={section.title}>
          <legend className="label label--rule">{section.title}</legend>
          {section.fields.map((f) => {
            const id = `c-${f.key}`;
            const v = values[f.key];
            return (
              <div className="field" key={f.key}>
                <div className="content-field__head">
                  <label htmlFor={f.kind === "list" ? undefined : id}>
                    {f.label}
                    {f.optional && <span className="muted" style={{ fontWeight: 400 }}> (optional)</span>}
                  </label>
                  {edited(f) && (
                    <span className="content-field__edited">
                      <span className="tag">Edited</span>
                      <button type="button" className="helper"
                        onClick={() => set(f.key, defaultValue(f))}>
                        Restore original
                      </button>
                    </span>
                  )}
                </div>

                {f.kind === "line" && (
                  <input className="input" id={id} name={f.key} maxLength={f.max}
                    value={v} onChange={(e) => set(f.key, e.target.value)}
                    aria-invalid={Boolean(errors[f.key])} />
                )}
                {f.kind === "text" && (
                  <textarea className="input" id={id} name={f.key} maxLength={f.max} rows={f.rows ?? 3}
                    value={v} onChange={(e) => set(f.key, e.target.value)}
                    aria-invalid={Boolean(errors[f.key])} />
                )}
                {f.kind === "list" && (
                  <>
                    <input type="hidden" name={f.key} value={v} />
                    <ListEditor
                      field={f}
                      value={parseList(v) ?? []}
                      onChange={(next) => set(f.key, JSON.stringify(next))}
                      error={errors[f.key]}
                    />
                  </>
                )}

                {errors[f.key]
                  ? <FieldError message={errors[f.key]} />
                  : (f.hint || f.kind !== "list") && (
                    <span className="hint">
                      {f.hint}
                      {f.kind !== "list" && (
                        <span className="content-field__count"> {v.length}/{f.max}</span>
                      )}
                    </span>
                  )}
              </div>
            );
          })}
        </fieldset>
      ))}

      {Object.keys(errors).length > 0 ? (
        <div className="note note--brass" role="alert">
          {Object.keys(errors).length === 1
            ? "One field needs fixing before this page can be saved."
            : `${Object.keys(errors).length} fields need fixing before this page can be saved.`}
        </div>
      ) : state.error ? (
        <div className="note note--brass" role="alert">{state.error}</div>
      ) : justSaved ? (
        <div className="note" role="status">
          Saved. The {def.label} page is showing this now.{" "}
          <Link className="tlink" href={def.path} target="_blank">View it</Link>
        </div>
      ) : null}

      <div className="btn-row content-form__bar">
        <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
          {pending ? "Saving…" : `Save ${def.label}`}
        </button>
        <Link className="tlink" href={def.path} target="_blank" style={{ marginLeft: ".6rem" }}>
          View the page
        </Link>
      </div>
    </form>
  );
}
