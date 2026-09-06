"use client";

import { useActionState } from "react";
import { updateSettings } from "@/app/admin/actions";
import type { Settings } from "@/lib/types";

const DAYS = [
  ["0", "Sunday"], ["1", "Monday"], ["2", "Tuesday"], ["3", "Wednesday"],
  ["4", "Thursday"], ["5", "Friday"], ["6", "Saturday"],
];

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(updateSettings, {} as { ok?: boolean; error?: string });
  const closed = new Set(settings.closed_days.split(",").map((s) => s.trim()));

  return (
    <form action={action} className="admin-form">
      <div className="label label--rule" style={{ margin: "0 0 1.2rem" }}>How people reach you</div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="whatsapp">WhatsApp number</label>
          <input className="input" id="whatsapp" name="whatsapp" defaultValue={settings.whatsapp}
            placeholder="923001234567" />
          <span className="hint">Country code, no spaces or symbols.</span>
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" defaultValue={settings.email}
            placeholder="hello@example.com" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="instagram">Instagram handle</label>
        <input className="input" id="instagram" name="instagram" defaultValue={settings.instagram}
          placeholder="rabt.wardrobe" />
      </div>

      <div className="label label--rule" style={{ margin: "2rem 0 1.2rem" }}>
        Optional contribution details
      </div>
      <div className="field">
        <label htmlFor="pay_title">Heading</label>
        <input className="input" id="pay_title" name="pay_title" defaultValue={settings.pay_title} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="pay_line1">Line 1</label>
          <input className="input" id="pay_line1" name="pay_line1" defaultValue={settings.pay_line1}
            placeholder="Account title: Rabt Community Wardrobe" />
        </div>
        <div className="field">
          <label htmlFor="pay_line2">Line 2</label>
          <input className="input" id="pay_line2" name="pay_line2" defaultValue={settings.pay_line2}
            placeholder="Account number: …" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="pay_line3">Line 3</label>
        <input className="input" id="pay_line3" name="pay_line3" defaultValue={settings.pay_line3}
          placeholder="Bank: …" />
      </div>

      <div className="label label--rule" style={{ margin: "2rem 0 1.2rem" }}>Collection times</div>
      <div className="field">
        <label htmlFor="slots">Time slots</label>
        <input className="input" id="slots" name="slots" defaultValue={settings.slots} />
        <span className="hint">Comma separated, e.g. <code>10:00, 11:00, 14:00</code>.</span>
      </div>
      <div className="field">
        <span className="field__label">Days you are closed</span>
        <div className="checkrow">
          {DAYS.map(([v, label]) => (
            <label className="checkchip" key={v}>
              <input type="checkbox" name="closed_day" value={v} defaultChecked={closed.has(v)}
                onChange={(e) => {
                  const form = e.currentTarget.form!;
                  const picked = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="closed_day"]:checked'))
                    .map((i) => i.value).join(",");
                  (form.querySelector('input[name="closed_days"]') as HTMLInputElement).value = picked;
                }} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <input type="hidden" name="closed_days" defaultValue={settings.closed_days} />
        <span className="hint">Closed days are greyed out in the borrowing calendar.</span>
      </div>

      {state?.error && <div className="note note--brass">{state.error}</div>}
      {state?.ok && <div className="note">Saved. The site is using these straight away.</div>}

      <div className="btn-row" style={{ marginTop: "1.6rem" }}>
        <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
