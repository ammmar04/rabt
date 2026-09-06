"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Fade-and-rise on scroll for anything marked .reveal.
 * Re-scans on navigation, and has a safety net so content can never stay
 * invisible if the observer does not fire.
 */
export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const els = () => Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.in)"));

    if (!("IntersectionObserver" in window)) {
      els().forEach((e) => e.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );

    const scan = () => els().forEach((e) => io.observe(e));
    scan();
    const rescan = setTimeout(scan, 300);

    const safety = setTimeout(() => {
      els().forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) e.classList.add("in");
      });
    }, 2200);

    return () => {
      io.disconnect();
      clearTimeout(rescan);
      clearTimeout(safety);
    };
  }, [pathname]);

  return null;
}
