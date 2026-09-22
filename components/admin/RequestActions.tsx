"use client";

import { useActionState, useState, useTransition } from "react";
import {
  closeRequestAction, confirmRequestAction, handOverAction,
} from "@/app/admin/actions";
import { CLOSE_REASONS, addDays, siteToday } from "@/lib/types";
import { fromFormData, validateClose, validateReturnDue, type ActionState } from "@/lib/forms";
import FieldError from "@/components/FieldError";
import { useFormErrors } from "./useFormErrors";

export function ConfirmButton({ requestRef }: { requestRef: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn--sm btn--ghost"
      type="button"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("ref", requestRef);
        start(() => confirmRequestAction(fd));
      }}
    >
      {pending ? "Saving…" : "Mark confirmed"}
    </button>
  );
}

/** Records the handover: the agreed return date and time. */
export function HandoverForm({ requestRef }: { requestRef: string }) {
  const [state, action, pending] = useActionState(handOverAction, {} as ActionState);
  const { errors, onSubmit, onInput } = useFormErrors(state.fields, (fd) =>
    validateReturnDue(fromFormData(fd)).errors, action
  );
  const today = siteToday();
  const id = (k: string) => `${k}-${requestRef}`;

  return (
    <form onSubmit={onSubmit} onInput={onInput} noValidate className="handover">
      <input type="hidden" name="ref" value={requestRef} />
      <span className="label">Hand over</span>
      <div className="handover__row">
        <label className="due-form__f" htmlFor={id("due_date")}>
          <span className="handover__l">Return date</span>
          <input className="input input--sm" type="date" id={id("due_date")} name="due_date"
            min={today} max={addDays(today, 365)} required
            aria-invalid={Boolean(errors.due_date)} aria-describedby={id("due_date-err")} />
        </label>
        <label className="due-form__f" htmlFor={id("due_time")}>
          <span className="handover__l">Time <span className="muted">(optional)</span></span>
          <input className="input input--sm" type="time" id={id("due_time")} name="due_time"
            aria-invalid={Boolean(errors.due_time)} aria-describedby={id("due_time-err")} />
        </label>
        <button className="btn btn--sm btn--primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Hand over"}
        </button>
      </div>
      <FieldError id={id("due_date-err")} message={errors.due_date} />
      <FieldError id={id("due_time-err")} message={errors.due_time} />
      {state.error && !state.fields && <FieldError message={state.error} />}
    </form>
  );
}

/**
 * Cancelling and marking unfulfilled both need a reason, so each button
 * opens a short form rather than acting straight away.
 */
export function CloseRequest({ requestRef }: { requestRef: string }) {
  const [mode, setMode] = useState<"cancelled" | "rejected" | null>(null);
  const [state, action, pending] = useActionState(closeRequestAction, {} as ActionState);
  const { errors, onSubmit, onInput } = useFormErrors(state.fields, (fd) =>
    validateClose(fromFormData(fd)).errors, action
  );
  const [reason, setReason] = useState("");
  const id = (k: string) => `${k}-${requestRef}`;

  if (!mode) {
    return (
      <div className="close-req">
        <button className="btn btn--sm btn--quiet" type="button" onClick={() => setMode("cancelled")}>
          Cancel request
        </button>
        <button className="btn btn--sm btn--quiet" type="button" onClick={() => setMode("rejected")}>
          Couldn&rsquo;t fulfil
        </button>
      </div>
    );
  }

  const cancelling = mode === "cancelled";
  return (
    <form onSubmit={onSubmit} onInput={onInput} noValidate className="close-form">
      <input type="hidden" name="ref" value={requestRef} />
      <input type="hidden" name="status" value={mode} />
      <span className="label">{cancelling ? "Cancel this request" : "Mark as unfulfilled"}</span>
      <p className="muted" style={{ fontSize: "var(--fs-small)" }}>
        {cancelling
          ? "Use this when the request is withdrawn — by the borrower, or as a duplicate."
          : "Use this when Rabt couldn't go ahead with it."}{" "}
        The garment goes back on the rail unless its status has been changed since.
      </p>
      <div className="field-row">
        <div className="field">
          <label htmlFor={id("reason")}>Reason</label>
          <select className="select" id={id("reason")} name="reason" value={reason}
            onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)}>
            <option value="">Choose one</option>
            {CLOSE_REASONS[mode].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <FieldError message={errors.reason} />
        </div>
        <div className="field">
          <label htmlFor={id("note")}>
            Note {reason === "Other" ? "" : <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>}
          </label>
          <input className="input" id={id("note")} name="note" maxLength={300}
            placeholder={reason === "Other" ? "What happened?" : "Anything worth remembering"}
            aria-invalid={Boolean(errors.note)} />
          <FieldError message={errors.note} />
        </div>
      </div>
      {state.error && !state.fields && <FieldError message={state.error} />}
      <div className="btn-row">
        <button className="btn btn--sm btn--primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : cancelling ? "Cancel request" : "Mark unfulfilled"}
        </button>
        <button className="btn btn--sm btn--quiet" type="button" onClick={() => { setMode(null); setReason(""); }}>
          Keep it
        </button>
      </div>
    </form>
  );
}
