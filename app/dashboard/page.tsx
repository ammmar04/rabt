import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "My Rabt",
  description: "Your current and previous borrowings.",
};

export default function DashboardPage() {
  return (
    <>
      <section className="wrap page-head">
        <span className="label label--olive">My Rabt</span>
        <h1 style={{ marginTop: "1rem" }}>Your borrowing.</h1>
      </section>
      <section className="wrap section--tight">
        <Dashboard />
      </section>
    </>
  );
}
