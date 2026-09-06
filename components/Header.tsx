"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { myRefs } from "@/lib/refs";

const NAV = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/contribute", label: "Contribute" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => setCount(myRefs().length), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  const current = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <>
      <header className="site-header">
        <div className="wrap header-in">
          <Link className="brand" href="/" aria-label="Rabt home">
            {/* Replace this span with <img src="/img/logo.svg" alt="Rabt" /> to use the real logo */}
            <span className="brand__mark">Rabt<em>.</em></span>
            <span className="brand__tag">A wardrobe we share</span>
          </Link>

          <nav className="nav" aria-label="Primary">
            <ul>
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} aria-current={current(n.href) ? "page" : undefined}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-actions">
            <Link className="btn btn--ghost" href="/dashboard" style={{ padding: ".62em 1.05em" }}>
              My Rabt
              {count > 0 && (
                <span className="badge badge--available" style={{ marginLeft: ".5em", padding: ".1em .4em" }}>
                  {count}
                </span>
              )}
            </Link>
            <button
              className="icon-btn menu-toggle"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M4 8h16M4 16h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="mobile-nav" data-open={open ? "1" : "0"}>
        <button className="icon-btn m-close" aria-label="Close menu" onClick={() => setOpen(false)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <ul>
          {NAV.map((n) => (
            <li key={n.href}><Link href={n.href}>{n.label}</Link></li>
          ))}
          <li><Link href="/dashboard">My Rabt</Link></li>
        </ul>
        <div className="mobile-nav__foot">Free to borrow. Open to everyone on campus.</div>
      </div>
    </>
  );
}
