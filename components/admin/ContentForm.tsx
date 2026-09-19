"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateContent } from "@/app/admin/actions";
import type { PageContent } from "@/lib/types";

export default function ContentForm({ content }: { content: PageContent }) {
  const [state, action, pending] = useActionState(
    updateContent,
    {} as { ok?: boolean; error?: string }
  );

  return (
    <form action={action} className="admin-form">
      <div className="label label--rule" style={{ margin: "0 0 1.2rem" }}>Catalogue page</div>

      <div className="field">
        <label htmlFor="cat_eyebrow">Small label above the heading</label>
        <input className="input" id="cat_eyebrow" name="cat_eyebrow"
          defaultValue={content.cat_eyebrow} placeholder="The wardrobe" maxLength={60} />
        <span className="hint">Shown in small caps. Leave it blank to hide it.</span>
      </div>

      <div className="field">
        <label htmlFor="cat_heading">Heading</label>
        <input className="input" id="cat_heading" name="cat_heading" required
          defaultValue={content.cat_heading} placeholder="Everything on the rail." maxLength={120} />
      </div>

      <div className="field">
        <label htmlFor="cat_intro">Text underneath the heading</label>
        <textarea className="input" id="cat_intro" name="cat_intro" rows={3}
          defaultValue={content.cat_intro} maxLength={400}
          placeholder="Borrow any of it, free." />
        <span className="hint">A sentence or two. Leave it blank to hide it.</span>
      </div>

      <div className="field">
        <label htmlFor="cat_empty">When a search or filter finds nothing</label>
        <input className="input" id="cat_empty" name="cat_empty"
          defaultValue={content.cat_empty} maxLength={200}
          placeholder="Nothing matches that just yet." />
        <span className="hint">
          Shown in place of the grid, with a button to clear the filters.
        </span>
      </div>

      {state?.error && <div className="note note--brass">{state.error}</div>}
      {state?.ok && <div className="note">Saved. The catalogue page is using this now.</div>}

      <div className="btn-row" style={{ marginTop: "1.6rem", alignItems: "center" }}>
        <button className="btn btn--primary btn--lg" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save content"}
        </button>
        <Link className="tlink" href="/catalogue" style={{ marginLeft: ".6rem" }}>
          View the catalogue page
        </Link>
      </div>
    </form>
  );
}
