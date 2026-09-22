"use client";

import { useTransition } from "react";
import { removeDetailsAction } from "@/app/admin/actions";

/** Clears a borrower's name and contact detail, keeping the record itself. */
export default function RemoveDetailsButton({ requestRef }: { requestRef: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn--quiet btn--sm"
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Remove the name and contact detail from ${requestRef}? The record of what was borrowed and when stays. This can't be undone.`)) return;
        const fd = new FormData();
        fd.set("ref", requestRef);
        start(() => removeDetailsAction(fd));
      }}
    >
      {pending ? "Removing…" : "Remove details"}
    </button>
  );
}
