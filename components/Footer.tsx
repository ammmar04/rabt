import Link from "next/link";

const WARDROBE = [
  { href: "/catalogue", label: "Everything" },
  { href: "/catalogue?category=suits", label: "Suits" },
  { href: "/catalogue?category=blazers", label: "Blazers" },
  { href: "/catalogue?category=shirts", label: "Collared shirts" },
  { href: "/catalogue?category=trousers", label: "Formal trousers" },
];

const ABOUT = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About Rabt" },
  { href: "/contribute", label: "Contribute something" },
  { href: "/dashboard", label: "My Rabt" },
  { href: "/privacy", label: "Privacy" },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="brand" href="/">
              <span className="brand__mark">Rabt<em>.</em></span>
            </Link>
            <p>
              A shared wardrobe of formal clothing, open to anyone on campus.
              Borrow what you need, return it when you are done.
            </p>
            <Link
              className="btn btn--ghost"
              href="/catalogue"
              style={{ marginTop: "1.4rem", borderColor: "var(--rule-on-dark)", color: "var(--paper)" }}
            >
              Browse the wardrobe
            </Link>
          </div>

          <div className="fcol">
            <h3>The wardrobe</h3>
            <ul>{WARDROBE.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </div>

          <div className="fcol">
            <h3>Rabt</h3>
            <ul>{ABOUT.map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Rabt</span>
          <span>
            <Link href="/privacy">Privacy</Link> &middot; <Link href="/admin">Team</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
