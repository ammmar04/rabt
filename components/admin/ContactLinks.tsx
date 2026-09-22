"use client";

import { useState } from "react";
import { formatPhone, waDigits } from "@/lib/validate";

/**
 * The borrower's contact detail, with one-tap ways to use it: WhatsApp opens
 * with a message already started, email with a subject, and anything can be
 * copied.
 */
export default function ContactLinks({
  method, value, name, reference, item,
}: {
  method: string; value: string; name: string; reference: string; item: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="muted">Contact detail removed</span>;
  }

  const greeting =
    `Hi${name ? ` ${name}` : ""}, this is Rabt about your request ${reference} for the ${item}.`;
  const wa = method === "WhatsApp" ? waDigits(value) : null;
  const shown = method === "WhatsApp" ? formatPhone(value) : value;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the value is on screen to copy by hand */
    }
  };

  return (
    <div className="contact">
      <div className="contact__v">
        <span className="contact__m">{method}</span>
        <span className="contact__d">{shown}</span>
      </div>
      <div className="contact__a">
        {wa && (
          <a className="btn btn--sm btn--primary" href={`https://wa.me/${wa}?text=${encodeURIComponent(greeting)}`}
            target="_blank" rel="noopener">
            WhatsApp
          </a>
        )}
        {wa && <a className="btn btn--sm btn--quiet" href={`tel:+${wa}`}>Call</a>}
        {method === "Email" && (
          <a className="btn btn--sm btn--primary"
            href={`mailto:${value}?subject=${encodeURIComponent(`Your Rabt request ${reference}`)}&body=${encodeURIComponent(greeting + "\n\n")}`}>
            Email
          </a>
        )}
        <button className="btn btn--sm btn--quiet" type="button" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
