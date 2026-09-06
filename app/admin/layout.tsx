import type { Metadata } from "next";
import { authConfigured, isSignedIn, usingDevPassword } from "@/lib/auth";
import { signOut } from "./actions";
import SignInForm from "@/components/admin/SignInForm";
import AdminTabs from "@/components/admin/AdminTabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wardrobe admin — Rabt",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!authConfigured()) {
    return (
      <section className="wrap wrap--narrow section">
        <span className="label label--olive">Team</span>
        <h1 style={{ marginTop: "1rem", fontSize: "var(--fs-h2)" }}>Admin is locked.</h1>
        <div className="note note--brass" style={{ marginTop: "1.4rem" }}>
          No <code>ADMIN_PASSWORD</code> is set for this deployment, so the wardrobe admin
          is closed rather than open to anyone. Add an <code>ADMIN_PASSWORD</code>{" "}
          environment variable in your Vercel project settings and redeploy.
        </div>
      </section>
    );
  }

  if (!(await isSignedIn())) {
    return <SignInForm devHint={usingDevPassword()} />;
  }

  return (
    <div className="wrap section--tight">
      <div className="admin-bar">
        <div>
          <span className="label label--olive">Team</span>
          <h1 className="admin-title">Wardrobe admin</h1>
        </div>
        <form action={signOut}>
          <button className="btn btn--quiet btn--sm" type="submit">Sign out</button>
        </form>
      </div>

      <AdminTabs />

      {children}
    </div>
  );
}
