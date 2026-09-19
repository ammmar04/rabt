"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Fade-and-rise on scroll for anything marked .reveal.
 *
 * .reveal starts at opacity 0, so anything the observer never sees stays
 * invisible. As well as scanning on navigation, this watches the DOM: a
 * .reveal element added later — by a filter, a search, any re-render — is
 * picked up straight away instead of being left blank.
 */
export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const els = () => Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.in)"));
    const show = (el: HTMLElement) => el.classList.add("in");

    if (!("IntersectionObserver" in window)) {
      els().forEach(show);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            show(e.target as HTMLElement);
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );

    const scan = () => els().forEach((e) => io.observe(e));
    scan();
    const rescan = setTimeout(scan, 300);

    // Anything already on screen is shown outright: an element mounted inside
    // the viewport must not wait for a scroll that may never come.
    const inView = (e: HTMLElement) => {
      const r = e.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0 && r.height > 0;
    };

    const mo = new MutationObserver((records) => {
      let found = false;
      for (const rec of records) {
        for (const node of rec.addedNodes) {
          if (node.nodeType !== 1) continue;
          const el = node as HTMLElement;
          if (el.classList?.contains("reveal") || el.querySelector?.(".reveal")) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) return;
      els().forEach((e) => {
        if (inView(e)) show(e);
        else io.observe(e);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const safety = setTimeout(() => els().forEach((e) => { if (inView(e)) show(e); }), 2200);

    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(rescan);
      clearTimeout(safety);
    };
  }, [pathname]);

  return null;
}
