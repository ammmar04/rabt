import Link from "next/link";
import type { Metadata } from "next";
import Steps from "@/components/Steps";

export const metadata: Metadata = {
  title: "How it works — Rabt",
  description: "How borrowing from Rabt works: browse, request, collect, return.",
};

const FAQS: [string, React.ReactNode][] = [
  ["How long can I keep something?",
   "Up to a week as standard. If you need it longer, say so when we confirm — it is usually fine."],
  ["What if it does not fit?",
   "Message us and we will swap it for another size if we have one, or find you something similar. Nothing is final until it actually fits."],
  ["Do I need to clean it before returning?",
   "No. Return it as-is and we handle the cleaning. That cost is what contributions go towards."],
  ["Is there any cost?",
   "No. Borrowing is free. There is an optional contribution at the end of the request if you want to chip in towards cleaning and repairs, and skipping it changes nothing."],
  ["Who can use Rabt?",
   "Anyone on campus. There is no eligibility check, no proof of anything, and no application asking about your circumstances."],
  ["Can I borrow two things at once?",
   "Yes, but as two separate requests — each piece is tracked and prepared on its own. Just go through the flow again for the second item."],
];

export default function HowItWorks() {
  return (
    <>
      <section className="wrap page-head">
        <span className="label label--olive">How it works</span>
        <h1 style={{ marginTop: "1rem" }}>Borrow something in about two minutes.</h1>
        <p className="lead">
          Find a piece, tell us your size and when you can collect it, and we take it from there.
        </p>
      </section>

      <section className="section--tight"><Steps /></section>

      <section className="wrap wrap--mid section--tight">
        <div className="head reveal" style={{ marginBottom: "1rem" }}>
          <span className="label">Good to know</span>
          <h2>The details.</h2>
        </div>
        {FAQS.map(([q, a]) => (
          <div className="pdp__block reveal" key={q}>
            <h3 style={{ fontFamily: "var(--sans)", fontSize: "var(--fs-h5)", fontWeight: 700, letterSpacing: 0 }}>{q}</h3>
            <p className="muted" style={{ marginTop: ".5rem", maxWidth: "60ch" }}>{a}</p>
          </div>
        ))}
        <div className="note reveal" style={{ marginTop: "2rem" }}>
          Still unsure about something? Ask before you request — there is no wrong question,
          and you do not have to explain why you need anything.
        </div>
        <div className="center" style={{ marginTop: "2.4rem" }}>
          <Link className="btn btn--primary btn--lg" href="/catalogue">Browse the wardrobe</Link>
        </div>
      </section>
    </>
  );
}
