"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Requests" },
  { href: "/admin/items", label: "Items" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminTabs() {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav className="tabs" aria-label="Admin sections">
      {TABS.map((t) => (
        <Link key={t.href} className="tab" href={t.href} aria-selected={active(t.href)}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
