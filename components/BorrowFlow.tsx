"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { submitBorrowRequest } from "@/app/actions";
import { rememberRef } from "@/lib/refs";
import {
  AMOUNTS, collectionDays, fillTokens, fullDate, itemTitle, niceDate, type Item, type Settings,
} from "@/lib/types";
import { contactFor, formatPhone, text, type FieldErrors } from "@/lib/validate";

/** No size step: the listing *is* one physical garment in one size. */
const STEPS = ["When", "Contact", "Contribute"];

const CONTACT_FIELDS: Record<string, {
  label: string; placeholder: string; hint: string;
  type: string; inputMode: "tel" | "email" | "text"; autoComplete: string; max: number;
}> = {
  WhatsApp: {
    label: "WhatsApp number", placeholder: "0322 4404049",
    hint: "11 digits, like 0322 4404049. Number from abroad? Start with + and the country code.",
    type: "tel", inputMode: "tel", autoComplete: "tel", max: 20,
  },
  Email: {
    label: "Email address", placeholder: "you@example.com",
    hint: "We'll write to you here to confirm.",
    type: "email", inputMode: "email", autoComplete: "email", max: 254,
  },
  "Secondary account": {
    label: "Handle or address", placeholder: "e.g. @yourname on Instagram",
    hint: "Say which app if it isn't obvious, so we know where to look.",
    type: "text", inputMode: "text", autoComplete: "off", max: 100,
  },
};

/** How the notices refer to each contact method. */
const METHOD_NAME: Record<string, string> = {
  WhatsApp: "WhatsApp",
  Email: "email",
  "Secondary account": "the account you gave us",
};

const COVERS = ["Dry cleaning", "Repairs and alterations", "Replacing worn pieces", "Storage and day-to-day running"];

/** Editable wording from Content → Borrowing, resolved on the server. */
export type BorrowCopy = Record<
  | "when_heading" | "when_intro" | "slot_note" | "contact_heading" | "contact_intro"
  | "contribute_heading" | "contribute_lead" | "contribute_body" | "send_notice"
  | "done_heading" | "done_body" | "done_after",
  string
>;

export default function BorrowFlow({
  item, settings, copy,
}: {
  item: Item; settings: Settings; copy: BorrowCopy;
}) {
  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [method, setMethod] = useState("");
  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [serverFields, setServerFields] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ref: string; contact: string } | null>(null);

  const slots = useMemo(
    () => settings.slots.split(",").map((s) => s.trim()).filter(Boolean),
    [settings.slots]
  );

  // The same calculation the server checks against, on campus time.
  const days = useMemo(
    () => collectionDays(settings.closed_days).map((d) => {
      const at = new Date(d.iso + "T00:00:00");
      return {
        ...d,
        label: at.toLocaleDateString("en-GB", { weekday: "short" }),
        num: at.getDate(),
      };
    }),
    [settings.closed_days]
  );

  const field = CONTACT_FIELDS[method];
  const contactCheck = method ? contactFor(method, contact) : null;
  const nameCheck = text(name, { label: "Name", max: 80 });

  const stepErrors = (s: number): FieldErrors => {
    const e: FieldErrors = {};
    if (s === 0) {
      if (!date) e.date = "Pick a day.";
      if (!time) e.time = "Pick a time.";
    }
    if (s === 1) {
      if (!method) e.method = "Choose how we should contact you.";
      else if (contactCheck?.error) e.contact = contactCheck.error;
      if (nameCheck.error) e.name = nameCheck.error;
    }
    return e;
  };

  // Field messages appear once someone has tried to continue, then follow
  // what they type so a fixed number clears its message straight away.
  const live = showErrors ? stepErrors(step) : {};
  const errs: FieldErrors = { ...serverFields, ...live };

  const go = (s: number) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function next() {
    setError("");
    const problems = stepErrors(step);
    if (Object.keys(problems).length) {
      setShowErrors(true);
      setError(Object.values(problems)[0]);
      return;
    }
    setShowErrors(false);
    setServerFields({});
    if (step < STEPS.length - 1) return go(step + 1);

    setBusy(true);
    let res: Awaited<ReturnType<typeof submitBorrowRequest>>;
    try {
      res = await submitBorrowRequest({
        itemId: item.id, date, time, method,
        contact, name, contribution: amount || "Not this time",
      });
    } catch {
      setBusy(false);
      setError("Your request couldn't be sent — check your connection and try again.");
      return;
    }
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      if (res.fields) {
        setServerFields(res.fields);
        if (res.fields.date || res.fields.time) go(0);
        else if (res.fields.method || res.fields.contact || res.fields.name) go(1);
      }
      return;
    }
    rememberRef(res.ref);
    setDone({ ref: res.ref, contact: res.contact });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const methodName = METHOD_NAME[method] ?? "the contact detail you gave us";

  if (done) {
    const shownContact = method === "WhatsApp" ? formatPhone(done.contact) : done.contact;
    return (
      <div className="done">
        <div className="done__mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>{copy.done_heading}</h2>
        <p className="lead" style={{ margin: ".9rem auto 0", maxWidth: "48ch" }}>
          {fillTokens(copy.done_body, {
            method: methodName, contact: shownContact, date: fullDate(date), time,
          })}
        </p>
        {copy.done_after && (
          <p className="muted" style={{ margin: ".8rem auto 0", maxWidth: "48ch" }}>{copy.done_after}</p>
        )}
        <div className="ref">{done.ref}</div>
        <p className="muted" style={{ fontSize: "var(--fs-small)", marginTop: ".6rem" }}>
          Your reference, if you need to mention this request.
        </p>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: "2rem" }}>
          <Link className="btn btn--primary" href="/dashboard">See my requests</Link>
          <Link className="btn btn--ghost" href="/catalogue">Back to the catalogue</Link>
        </div>
      </div>
    );
  }

  const summaryBits = [item.type, item.colour];
  if (item.size) summaryBits.push(`Size ${item.size}`);
  if (date && time) summaryBits.push(`${niceDate(date)}, ${time}`);

  return (
    <>
      <div className="summary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image_url} alt="" />
        <div>
          <div className="summary__t">{itemTitle(item)}</div>
          <div className="summary__m">{summaryBits.filter(Boolean).join(" · ")}</div>
        </div>
        <span className="tag" style={{ marginLeft: "auto" }}>{item.id}</span>
      </div>

      <div className="stepper">
        {STEPS.map((label, i) => (
          <div className="step" key={label} data-state={i === step ? "active" : i < step ? "done" : ""}>
            <span className="step__n">{i + 1}</span>
            <span className="step__t">{label}</span>
            {i < STEPS.length - 1 && <span className="step__bar" />}
          </div>
        ))}
      </div>

      {/* 1 — when to collect */}
      <div className="panel" data-active={step === 0 ? "1" : "0"}>
        <h2>{copy.when_heading}</h2>
        <p className="muted" style={{ marginTop: ".6rem" }}>{copy.when_intro}</p>
        <div className="days" style={{ marginTop: "1.4rem" }} role="group" aria-label="Collection day">
          {days.map((d) => (
            <button
              key={d.iso}
              className="day"
              type="button"
              role="switch"
              aria-pressed={date === d.iso}
              disabled={d.closed}
              onClick={() => setDate(d.iso)}
            >
              <span className="day__d">{d.label}</span>
              <span className="day__n">{d.num}</span>
            </button>
          ))}
        </div>
        {errs.date && <p className="field__error">{errs.date}</p>}
        <div className="label" style={{ margin: "1.6rem 0 .7rem" }}>Time</div>
        <div className="slots" role="group" aria-label="Collection time">
          {slots.map((t) => (
            <button key={t} className="slot" type="button" role="switch" aria-pressed={time === t} onClick={() => setTime(t)}>
              {t}
            </button>
          ))}
        </div>
        {errs.time && <p className="field__error">{errs.time}</p>}
        {copy.slot_note && <p className="slot-note">{copy.slot_note}</p>}
        {date && time && (
          <div className="picked">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            <span>{fullDate(date)} at {time}</span>
          </div>
        )}
      </div>

      {/* 2 — contact */}
      <div className="panel" data-active={step === 1 ? "1" : "0"}>
        <h2>{copy.contact_heading}</h2>
        <p className="muted" style={{ marginTop: ".6rem" }}>{copy.contact_intro}</p>
        <div style={{ marginTop: "1.6rem" }}>
          <div className="field">
            <label htmlFor="c-method">Preferred contact</label>
            <select
              className="select"
              id="c-method"
              value={method}
              aria-invalid={Boolean(errs.method)}
              onChange={(e) => { setMethod(e.target.value); setContact(""); setServerFields({}); }}
            >
              <option value="">Choose one</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Secondary account">A secondary / spare account</option>
            </select>
            {errs.method && <span className="field__error">{errs.method}</span>}
          </div>
          <div className="field">
            <label htmlFor="c-value">{field?.label ?? "Contact details"}</label>
            <input
              className="input"
              id="c-value"
              type={field?.type ?? "text"}
              inputMode={field?.inputMode}
              autoComplete={field?.autoComplete ?? "off"}
              maxLength={field?.max ?? 100}
              disabled={!method}
              placeholder={field?.placeholder ?? "Choose a method first"}
              value={contact}
              aria-invalid={Boolean(errs.contact)}
              aria-describedby="c-value-msg"
              onChange={(e) => { setContact(e.target.value); setServerFields({}); }}
              onBlur={() => { if (contact.trim()) setShowErrors(true); }}
            />
            {errs.contact
              ? <span className="field__error" id="c-value-msg">{errs.contact}</span>
              : <span className="hint" id="c-value-msg">{field?.hint ?? "We only use this to arrange your borrowing."}</span>}
          </div>
          <div className="field">
            <label htmlFor="c-name">
              Name you&rsquo;d like us to use{" "}
              <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              className="input"
              id="c-name"
              autoComplete="given-name"
              maxLength={80}
              placeholder="So we know who we're talking to"
              value={name}
              aria-invalid={Boolean(errs.name)}
              onChange={(e) => setName(e.target.value)}
            />
            {errs.name && <span className="field__error">{errs.name}</span>}
          </div>
        </div>
      </div>

      {/* 3 — contribution, then send */}
      <div className="panel" data-active={step === 2 ? "1" : "0"}>
        <h2>{copy.contribute_heading}</h2>
        <p className="lead" style={{ marginTop: ".7rem" }}>{copy.contribute_lead}</p>
        <div className="contrib" style={{ marginTop: "1.4rem" }}>
          <p>{copy.contribute_body}</p>
          <div className="label" style={{ marginTop: "1.2rem" }}>Contributions go towards</div>
          <ul style={{ marginTop: ".6rem", display: "grid", gap: ".4rem", fontSize: "var(--fs-small)", color: "var(--ink-2)" }}>
            {COVERS.map((c) => (
              <li key={c} style={{ display: "flex", gap: ".5em", alignItems: "flex-start" }}>
                <span style={{ color: "var(--olive)", flexShrink: 0 }}>&mdash;</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <div className="contrib__opt">
            {AMOUNTS.map((a) => (
              <button key={a} className="amount" type="button" role="switch" aria-pressed={amount === a} onClick={() => setAmount(a)}>
                {a}
              </button>
            ))}
          </div>
          {amount && amount !== "Not this time" && (
            <div className="pay">
              <span className="label">{settings.pay_title}</span>
              {settings.pay_line1 && <span>{settings.pay_line1}</span>}
              {settings.pay_line2 && <span>{settings.pay_line2}</span>}
              {settings.pay_line3 && <span>{settings.pay_line3}</span>}
              <span className="muted" style={{ marginTop: ".4rem" }}>
                Send whenever suits you — it makes no difference to your request.
              </span>
            </div>
          )}
        </div>

        <div className="note note--brass send-notice" role="note">
          <strong>Not a confirmed booking yet.</strong>{" "}
          {fillTokens(copy.send_notice, { method: methodName })}
        </div>
      </div>

      {error && <div className="note note--brass" role="alert" style={{ marginTop: "1.4rem" }}>{error}</div>}

      <div className="btn-row" style={{ marginTop: "2.2rem", justifyContent: "space-between" }}>
        <button
          className="btn btn--quiet"
          type="button"
          style={{ visibility: step === 0 ? "hidden" : "visible" }}
          onClick={() => { setError(""); setShowErrors(false); go(Math.max(0, step - 1)); }}
        >
          Back
        </button>
        <button
          className="btn btn--primary"
          type="button"
          aria-disabled={busy}
          onClick={next}
        >
          {busy ? "Sending…" : step === STEPS.length - 1 ? "Send request" : "Continue"}
        </button>
      </div>
    </>
  );
}
