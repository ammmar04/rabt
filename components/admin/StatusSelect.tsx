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
  width = 170,
}: {
  action: (fd: FormData) => Promise<void>;
  hidden: Record<string, string>;
  name: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  width?: number;
}) {
  const [pending, start] = useTransition();

  return (
    <select
      className="select"
      name={name}
      defaultValue={String(value)}
      disabled={pending}
      style={{ minWidth: width, padding: ".4em .6em", opacity: pending ? 0.6 : 1 }}
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
