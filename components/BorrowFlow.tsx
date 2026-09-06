"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { submitBorrowRequest } from "@/app/actions";
import { rememberRef } from "@/lib/refs";
import { fullDate, niceDate, parseSizes, type Item, type Settings } from "@/lib/types";

const STEPS = ["Size", "When", "Contact", "Contribute"];

const CONTACT_FIELDS: Record<string, [string, string]> = {
  WhatsApp: ["WhatsApp number", "e.g. 03xx xxxxxxx"],
  Email: ["Email address", "you@example.com"],
  "Secondary account": ["Handle or address", "Whatever you check most"],
};

const AMOUNTS = ["Rs 200", "Rs 500", "Rs 1,000", "Another amount", "Not this time"];

const COVERS = ["Dry cleaning", "Repairs and alterations", "Replacing worn pieces", "Storage and day-to-day running"];

export default function BorrowFlow({ item, settings }: { item: Item; settings: Settings; }) {
  const sizes = parseSizes(item.sizes);
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const preset = params?.get("size") ?? "";

  const [step, setStep] = useState(preset && sizes.includes(preset) ? 1 : 0);
  const [size, setSize] = useState(sizes.includes(preset) ? preset : "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [method, setMethod] = useState("");
  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const slots = useMemo(
    () => settings.slots.split(",").map((s) => s.trim()).filter(Boolean),
    [settings.slots]
  );
  const closed = useMemo(
    () => new Set(settings.closed_days.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n))),
    [settings.closed_days]
  );

  const days = useMemo(() => {
    const out: { iso: string; label: string; num: number; closed: boolean }[] = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    while (out.length < 7) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({
        iso,
        label: d.toLocaleDateString("en-GB", { weekday: "short" }),
        num: d.getDate(),
        closed: closed.has(d.getDay()),
      });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [closed]);

  const canAdvance = () => {
    if (step === 0) return !!size;
    if (step === 1) return !!(date && time);
    if (step === 2) return !!method && contact.trim().length > 2;
    return true;
  };

  const nudge = () =>
    setError(
      step === 0 ? "Choose a size to continue."
      : step === 1 ? "Pick a day and a time."
      : "Add a way for us to reach you."
    );

  async function next() {
    setError("");
    if (!canAdvance()) return nudge();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setBusy(true);
    const res = await submitBorrowRequest({
      itemId: item.id, size, date, time, method,
      contact, name, contribution: amount || "Not this time",
    });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    rememberRef(res.ref);
    setDone(res.ref);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <div className="done">
        <div className="done__mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2>That&rsquo;s booked in.</h2>
        <p className="lead" style={{ margin: ".9rem auto 0", maxWidth: "44ch" }}>
          We&rsquo;ll message you on {method} to confirm your collection details for{" "}
          {fullDate(date)} at {time}.
        </p>
        <div className="ref">{done}</div>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: "2rem" }}>
          <Link className="btn btn--primary" href="/dashboard">See my borrowing</Link>
          <Link className="btn btn--ghost" href="/catalogue">Back to the catalogue</Link>
        </div>
      </div>
    );
  }

  const summaryBits = [item.type, item.colour];
  if (size) summaryBits.push(`Size ${size}`);
  if (date && time) summaryBits.push(`${niceDate(date)}, ${time}`);

  return (
    <>
      <div className="summary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image_url} alt="" />
        <div>
          <div className="summary__t">{item.name}</div>
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

      {/* 1 — size */}
      <div className="panel" data-active={step === 0 ? "1" : "0"}>
        <h2>Which size do you need?</h2>
        <p className="muted" style={{ marginTop: ".6rem" }}>
          Listed sizes are the ones we currently have for this piece.
        </p>
        <div className="sizes" style={{ marginTop: "1.4rem" }}>
          {sizes.map((s) => (
            <button key={s} className="size" role="switch" aria-pressed={size === s} onClick={() => setSize(s)}>
              {s}
            </button>
          ))}
        </div>
        <button className="helper" type="button" style={{ marginTop: "1.1rem" }} onClick={() => setHelpOpen((v) => !v)}>
          Not sure about your size?
        </button>
        {helpOpen && (
          <div className="note" style={{ marginTop: ".9rem" }}>
            Lay a similar garment flat, measure across the chest, and double it. Between
            sizes? Take the larger one — or pick either and mention it when we confirm;
            swapping is easy.
          </div>
        )}
      </div>

      {/* 2 — when */}
      <div className="panel" data-active={step === 1 ? "1" : "0"}>
        <h2>When suits you?</h2>
        <p className="muted" style={{ marginTop: ".6rem" }}>
          Pick a day this coming week and a time. We&rsquo;ll confirm the exact collection
          point when we message you.
        </p>
        <div className="days" style={{ marginTop: "1.4rem" }}>
          {days.map((d) => (
            <button
              key={d.iso}
              className="day"
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
        <div className="label" style={{ margin: "1.6rem 0 .7rem" }}>Time</div>
        <div className="slots">
          {slots.map((t) => (
            <button key={t} className="slot" role="switch" aria-pressed={time === t} onClick={() => setTime(t)}>
              {t}
            </button>
          ))}
        </div>
        {date && time && (
          <div className="picked">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            <span>{fullDate(date)} at {time}</span>
          </div>
        )}
      </div>

      {/* 3 — contact */}
      <div className="panel" data-active={step === 2 ? "1" : "0"}>
        <h2>How should we reach you?</h2>
        <p className="muted" style={{ marginTop: ".6rem" }}>
          Just so we can confirm your request and share collection details. Nothing else —
          no ID, no forms.
        </p>
        <div style={{ marginTop: "1.6rem" }}>
          <div className="field">
            <label htmlFor="c-method">Preferred contact</label>
            <select
              className="select"
              id="c-method"
              value={method}
              onChange={(e) => { setMethod(e.target.value); setContact(""); }}
            >
              <option value="">Choose one</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Secondary account">A secondary / spare account</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-value">{CONTACT_FIELDS[method]?.[0] ?? "Contact details"}</label>
            <input
              className="input"
              id="c-value"
              autoComplete="off"
              disabled={!method}
              placeholder={CONTACT_FIELDS[method]?.[1] ?? "Choose a method first"}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            <span className="hint">We only use this to arrange your borrowing.</span>
          </div>
          <div className="field">
            <label htmlFor="c-name">
              Name you&rsquo;d like us to use{" "}
              <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              className="input"
              id="c-name"
              autoComplete="off"
              placeholder="Anything you like"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 4 — contribution */}
      <div className="panel" data-active={step === 3 ? "1" : "0"}>
        <h2>Want to contribute?</h2>
        <p className="lead" style={{ marginTop: ".7rem" }}>
          Rabt is free to use, and it stays free whatever you choose here.
        </p>
        <div className="contrib" style={{ marginTop: "1.4rem" }}>
          <p>
            If you&rsquo;d like to chip in towards keeping the wardrobe in good condition,
            you can — entirely optional, and nothing changes if you skip it.
          </p>
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
              <button key={a} className="amount" role="switch" aria-pressed={amount === a} onClick={() => setAmount(a)}>
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
                Send whenever suits you — your borrowing is confirmed either way.
              </span>
            </div>
          )}
        </div>
      </div>

      {error && <div className="note note--brass" style={{ marginTop: "1.4rem" }}>{error}</div>}

      <div className="btn-row" style={{ marginTop: "2.2rem", justifyContent: "space-between" }}>
        <button
          className="btn btn--quiet"
          type="button"
          style={{ visibility: step === 0 ? "hidden" : "visible" }}
          onClick={() => { setError(""); setStep(Math.max(0, step - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        >
          Back
        </button>
        <button
          className="btn btn--primary"
          type="button"
          aria-disabled={!canAdvance() || busy}
          onClick={next}
        >
          {busy ? "Sending…" : step === STEPS.length - 1 ? "Confirm request" : "Continue"}
        </button>
      </div>
    </>
  );
}
