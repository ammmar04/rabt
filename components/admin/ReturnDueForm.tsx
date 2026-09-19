"use client";

import { useTransition } from "react";
import { saveExpectedReturn } from "@/app/admin/actions";

/**
 * The expected return the team agrees with the borrower at handover. Kept as
 * two plain pickers so it can be filled in at the counter in a few seconds.
 */
export default function ReturnDueForm({
  requestRef,
  date,
  time,
  compact = false,
}: {
  requestRef: string;
  date: string | null;
  time: string;
  /** Inline in a table row rather than stacked with its own labels. */
  compact?: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <form
      className="due-form"
      data-compact={compact ? "1" : "0"}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => { void saveExpectedReturn(fd); });
      }}
    >
      <input type="hidden" name="ref" value={requestRef} />
      <label className="due-form__f">
        {!compact && <span className="label">Date</span>}
        <input
          className="input input--sm"
          type="date"
          name="return_date"
          aria-label="Expected return date"
          defaultValue={date ?? ""}
        />
      </label>
      <label className="due-form__f">
        {!compact && <span className="label">Time</span>}
        <input
          className="input input--sm"
          type="time"
          name="return_time"
          aria-label="Expected return time"
          defaultValue={time}
        />
      </label>
      <button className="btn btn--quiet btn--sm" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
