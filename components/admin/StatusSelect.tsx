"use client";

import { useTransition } from "react";

/**
 * A select that saves the moment it changes — no separate "save" button to
 * forget about.
 */
export default function StatusSelect({
  action,
  hidden,
  name,
  value,
  options,
  width,
}: {
  action: (fd: FormData) => Promise<void>;
  hidden: Record<string, string>;
  name: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  /** Optional override in px. Defaults to a width verified to fit this
   * app's longest status labels — see the note below before shrinking it. */
  width?: number;
}) {
  const [pending, start] = useTransition();
  // A native <select>'s closed-state text does not size the way
  // canvas-measured text width would suggest — measured at ~113px for
  // "Currently borrowed" and ~117px for "Ready for collection", but each
  // needed a ~290px box before the full label stopped getting clipped.
  // Rather than guess at that gap again, this default was found by directly
  // bisecting the rendered width until both of this app's longest labels
  // ("Currently borrowed", "Ready for collection") displayed in full, then
  // padded for headroom. Deliberately NOT overriding padding here — .select
  // reserves 2.4em on the right for the dropdown arrow.
  const DEFAULT_WIDTH = 320;

  return (
    <select
      className="select"
      name={name}
      // Uncontrolled, so the browser keeps the choice while the action runs.
      // Re-keying on the saved value means a status changed elsewhere — by
      // saving an expected return, say — still shows up here after the
      // server re-renders, instead of leaving a stale label behind.
      key={String(value)}
      defaultValue={String(value)}
      disabled={pending}
      style={{ minWidth: width ?? DEFAULT_WIDTH, opacity: pending ? 0.6 : 1 }}
      onChange={(e) => {
        const fd = new FormData();
        Object.entries(hidden).forEach(([k, v]) => fd.set(k, v));
        fd.set(name, e.target.value);
        start(() => { void action(fd); });
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
