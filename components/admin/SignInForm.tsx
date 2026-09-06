"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/actions";

export default function SignInForm({ devHint }: { devHint: boolean }) {
  const [state, action, pending] = useActionState(signIn, {} as { error?: string });

  return (
    <section className="wrap wrap--narrow section" style={{ maxWidth: "26rem" }}>
      <span className="label label--olive">Team</span>
      <h1 style={{ marginTop: "1rem", fontSize: "var(--fs-h2)" }}>Wardrobe admin.</h1>
      <p className="muted" style={{ marginTop: ".8rem" }}>
        Sign in to manage the wardrobe.
      </p>

      <form action={action} style={{ marginTop: "2rem" }}>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>
        {state?.error && (
          <div className="note note--brass" style={{ marginBottom: "1rem" }}>{state.error}</div>
        )}
        <button className="btn btn--primary btn--block btn--lg" type="submit" disabled={pending}>
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>

      {devHint && (
        <div className="note" style={{ marginTop: "1.6rem" }}>
          <strong>Local development.</strong> No <code>ADMIN_PASSWORD</code> is set, so the
          temporary password <code>rabt-dev</code> works here. Set a real one before
          deploying — in production the admin area stays locked until you do.
        </div>
      )}
    </section>
  );
}
