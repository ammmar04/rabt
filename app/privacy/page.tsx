import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Rabt",
  description: "What Rabt collects, and what it deliberately does not.",
};

const SECTIONS: [string, string][] = [
  ["What we collect",
   "The item you asked for, your size, the day and time you chose, and the contact detail you gave us. Optionally a name you would like us to use."],
  ["What we do not collect",
   "Student ID numbers, financial information, proof of need, your reason for borrowing, or any background about your circumstances. We do not ask, so there is nothing to store."],
  ["Who can see it",
   "The small team running Rabt, only to prepare and hand over your borrowing. There are no public lists of who has borrowed what, and we do not share details with anyone else."],
  ["How long we keep it",
   "Request records are kept while the item is out and for a short period after it is returned, so we can keep the wardrobe in order. Ask us to remove your details at any point and we will."],
  ["On this website",
   "Your borrowing history on the My Rabt page is matched using reference numbers stored in your own browser. No advertising or tracking cookies are set."],
];

export default function Privacy() {
  return (
    <>
      <section className="wrap page-head">
        <span className="label label--olive">Privacy</span>
        <h1 style={{ marginTop: "1rem" }}>What Rabt keeps.</h1>
        <p className="lead">
          Short version: a way to contact you about your borrowing, and nothing else.
        </p>
      </section>
      <section className="wrap wrap--narrow section--tight">
        <div className="reveal" style={{ display: "grid", gap: "1.6rem" }}>
          {SECTIONS.map(([h, body]) => (
            <div key={h}>
              <h3 style={{ fontFamily: "var(--sans)", fontSize: "var(--fs-h5)", fontWeight: 700, letterSpacing: 0 }}>{h}</h3>
              <p className="muted" style={{ marginTop: ".5rem" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
