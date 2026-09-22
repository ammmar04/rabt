"use client";

import { useActionState } from "react";
import { saveLendingDue } from "@/app/admin/actions";
import { addDays } from "@/lib/types";
import { fromFormData, validateReturnDue, type ActionState } from "@/lib/forms";
import FieldError from "@/components/FieldError";
import { useFormErrors } from "./useFormErrors";

/** Changes the agreed return on a garment that is out on loan. */
export default function ReturnDueForm({
  lendingId, date, time, lentOn,
}: {
  lendingId: number;
  date: string | null;
  time: string;
  /** YYYY-MM-DD the garment was handed over; the return can't be before it. */
  lentOn: string;
}) {
  const [state, action, pending] = useActionState(saveLendingDue, {} as ActionState);
  const { errors, onSubmit, onInput } = useFormErrors(state.fields, (fd) =>
    validateReturnDue(fromFormData(fd), { from: lentOn }).errors, action
  );

  return (
    <form onSubmit={onSubmit} onInput={onInput} noValidate className="due-form" data-compact="1">
      <input type="hidden" name="lending" value={lendingId} />
      <label className="due-form__f">
        <input className="input input--sm" type="date" name="due_date" aria-label="Expected return date"
          defaultValue={date ?? ""} min={lentOn} max={addDays(lentOn, 365)} required
          aria-invalid={Boolean(errors.due_date)} />
      </label>
      <label className="due-form__f">
        <input className="input input--sm" type="time" name="due_time" aria-label="Expected return time"
          defaultValue={time} aria-invalid={Boolean(errors.due_time)} />
      </label>
      <button className="btn btn--quiet btn--sm" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      {(errors.due_date || errors.due_time) && (
        <div className="due-form__err"><FieldError message={errors.due_date ?? errors.due_time} /></div>
      )}
    </form>
  );
}
