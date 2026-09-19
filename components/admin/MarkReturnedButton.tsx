"use client";

import { useTransition } from "react";
import { markReturned } from "@/app/admin/actions";

/** Closes a borrowing and puts the garment back on the rail. */
export default function MarkReturnedButton({ requestRef }: { requestRef: string }) {
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => { void markReturned(fd); });
      }}
    >
      <input type="hidden" name="ref" value={requestRef} />
      <button className="btn btn--quiet btn--sm" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Mark returned"}
      </button>
    </form>
  );
}
