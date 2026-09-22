"use client";

import { useState, useTransition } from "react";
import { markReturned } from "@/app/admin/actions";
import { ITEM_STATUSES } from "@/lib/types";

/** Where a returned garment can go: back on the rail, or off to be cleaned or mended. */
const NEXT = ITEM_STATUSES.filter((s) => s.value !== "borrowed" && s.value !== "on_hold");

/** Closes a borrowing. The lending record keeps the actual return date. */
export default function MarkReturnedButton({ lendingId }: { lendingId: number }) {
  const [pending, start] = useTransition();
  const [next, setNext] = useState<string>("available");

  return (
    <div className="returned">
      <button
        className="btn btn--quiet btn--sm"
        type="button"
        disabled={pending}
        onClick={() => {
          const fd = new FormData();
          fd.set("lending", String(lendingId));
          fd.set("next", next);
          start(() => markReturned(fd));
        }}
      >
        {pending ? "Saving…" : "Mark returned"}
      </button>
      <label className="returned__next">
        <span>then</span>
        <select className="select select--sm" value={next} onChange={(e) => setNext(e.target.value)}
          aria-label="Garment status after return">
          {NEXT.map((s) => (
            <option key={s.value} value={s.value}>{s.value === "available" ? "Back on the rail" : s.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
