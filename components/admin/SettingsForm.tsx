"use client";

import { useActionState } from "react";
import { updateSettings } from "@/app/admin/actions";
import type { Settings } from "@/lib/types";
import { fromFormData, validateSettings, type ActionState } from "@/lib/forms";
import FieldError from "@/components/FieldError";
import { useFormErrors } from "./useFormErrors";

const DAYS = [
  ["0", "Sunday"], ["1", "Monday"], ["2", "Tuesday"], ["3", "Wednesday"],
  ["4", "Thursday"], ["5", "Friday"], ["6", "Saturday"],
];

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(updateSettings, {} as ActionState);
  const { errors, onSubmit, onInput } = useFormErrors(state.fields, (fd) => {
    // The closed-day boxes feed one comma-separated value.
    fd.set("closed_days", fd.getAll("closed_day").join(","));
    return validateSettings(fromFormData(fd)).errors;
  }, (fd) => {
    fd.set("closed_days", fd.getAll("closed_day").join(","));
    action(fd);
  });
  const closed = new Set(settings.closed_days.split(",").map((s) => s.trim()));
  const err = (k: string) => ({ "aria-invalid": Boolean(errors[k]) });

  return (
    <form onSubmit={onSubmit} onInput={onInput} noValidate className="admin-form">
      <div className="label label--rule" style={{ margin: "0 0 1.2rem" }}>How people reach you</div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="whatsapp">WhatsApp number</label>
          <input className="input" id="whatsapp" name="whatsapp" defaultValue={settings.whatsapp}
            inputMode="tel" maxLength={20} placeholder="923001234567" {...err("whatsapp")} />
          {errors.whatsapp
            ? <FieldError message={errors.whatsapp} />
            : <span className="hint">With the country code, like 923001234567. 0300 1234567 works too.</span>}
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" defaultValue={settings.email}
            maxLength={254} placeholder="hello@example.com" {...err("email")} />
          <FieldError message={errors.email} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="instagram">Instagram handle</label>
        <input className="input" id="instagram" name="instagram" defaultValue={settings.instagram}
          maxLength={60} placeholder="rabt.wardrobe" {...err("instagram")} />
        <FieldError message={errors.instagram} />
      </div>

      <div className="label label--rule" style={{ margin: "2rem 0 1.2rem" }}>
        Optional contribution details
      </div>
      <div className="field">
        <label htmlFor="pay_title">Heading</label>
        <input className="input" id="pay_title" name="pay_title" defaultValue={settings.pay_title}
          maxLength={60} {...err("pay_title")} />
        <FieldError message={errors.pay_title} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="pay_line1">Line 1</label>
          <input className="input" id="pay_line1" name="pay_line1" defaultValue={settings.pay_line1}
            maxLength={120} placeholder="Account title: Rabt Community Wardrobe" {...err("pay_line1")} />
          <FieldError message={errors.pay_line1} />
        </div>
        <div className="field">
          <label htmlFor="pay_line2">Line 2</label>
          <input className="input" id="pay_line2" name="pay_line2" defaultValue={settings.pay_line2}
            maxLength={120} placeholder="Account number: …" {...err("pay_line2")} />
          <FieldError message={errors.pay_line2} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="pay_line3">Line 3</label>
        <input className="input" id="pay_line3" name="pay_line3" defaultValue={settings.pay_line3}
          maxLength={120} placeholder="Bank: …" {...err("pay_line3")} />
        <FieldError message={errors.pay_line3} />
      </div>

      <div className="label label--rule" style={{ margin: "2rem 0 1.2rem" }}>Collection times</div>
      <div className="field">
        <label htmlFor="slots">Time slots</label>
        <input className="input" id="slots" name="slots" defaultValue={settings.slots}
          maxLength={200} {...err("slots")} />
        {errors.slots
          ? <FieldError message={errors.slots} />
          : <span className="hint">24-hour times, separated by commas, e.g. <code>10:00, 11:30, 14:00</code>.</span>}
      </div>
      <div className="field">
        <span className="field__label">Days you are closed</span>
        <div className="checkrow" data-field="closed_days" tabIndex={-1}>
          {DAYS.map(([v, label]) => (
            <label className="checkchip" key={v}>
              <input type="checkbox" name="closed_day" value={v} defaultChecked={closed.has(v)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {errors.closed_days
          ? <FieldError message={errors.closed_days} />
          : <span className="hint">Closed days are greyed out when people pick a collection day.</span>}
      </div>

      {Object.keys(errors).length > 0 ? (
        <div className="note note--brass" role="alert">Some settings need fixing before they can be saved.</div>
      ) : state?.error ? (
        <div className="note note--brass" role="alert">{state.error}</div>
      ) : state?.ok && !pending ? (
        <div className="note" role="status">Saved. The site is using these straight away.</div>
      ) : null}

      <div className="btn-row" style={{ marginTop: "1.6rem" }}>
        <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
