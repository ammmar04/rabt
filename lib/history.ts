/**
 * Figures for Request & Lending History, worked out from the records every
 * time the page loads. Nothing here is stored or typed in, so the numbers
 * always agree with the request and lending rows underneath them.
 */
import {
  addDays, daysBetween, siteDateOf, siteToday,
  type Lending, type Request,
} from "./types";

type Req = Pick<Request, "status" | "created_at" | "closed_at" | "close_reason">;
type Lend = Pick<Lending, "item_id" | "lent_at" | "returned_at" | "due_date">;

export type Summary = {
  totalRequests: number;
  fulfilled: number;
  cancelled: number;
  rejected: number;
  open: number;
  totalLends: number;
  /** Out on loan right now. */
  inCirculation: number;
  garmentsLent: number;
  avgLoanDays: number | null;
  returnedLate: number;
  overdueNow: number;
  /** Fulfilled, as a share of requests that have been decided either way. */
  fulfilmentRate: number | null;
};

export function summarise(requests: Req[], lendings: Lend[]): Summary {
  const count = (s: string) => requests.filter((r) => r.status === s).length;
  const fulfilled = count("collected") + count("returned");
  const cancelled = count("cancelled");
  const rejected = count("rejected");
  const decided = fulfilled + cancelled + rejected;

  const back = lendings.filter((l) => l.returned_at);
  const lengths = back
    .map((l) => {
      const out = siteDateOf(l.lent_at), home = siteDateOf(l.returned_at);
      return out && home ? daysBetween(out, home) : null;
    })
    .filter((n): n is number => n !== null);
  const today = siteToday();

  return {
    totalRequests: requests.length,
    fulfilled,
    cancelled,
    rejected,
    open: count("pending") + count("confirmed"),
    totalLends: lendings.length,
    inCirculation: lendings.length - back.length,
    garmentsLent: new Set(lendings.map((l) => l.item_id)).size,
    avgLoanDays: lengths.length ? Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10 : null,
    returnedLate: back.filter((l) => l.due_date && (siteDateOf(l.returned_at) ?? "") > l.due_date).length,
    overdueNow: lendings.filter((l) => !l.returned_at && l.due_date && l.due_date < today).length,
    fulfilmentRate: decided ? Math.round((fulfilled / decided) * 100) : null,
  };
}

export type MonthRow = {
  /** YYYY-MM */
  month: string;
  label: string;
  short: string;
  requests: number;
  lends: number;
  returns: number;
  cancelled: number;
  rejected: number;
};

const monthOf = (iso: string | null | undefined) => siteDateOf(iso)?.slice(0, 7) ?? null;

function monthLabel(month: string, style: "long" | "short"): string {
  const d = new Date(`${month}-01T00:00:00`);
  return style === "long"
    ? d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : d.toLocaleDateString("en-GB", { month: "short" });
}

/**
 * Activity per month, on campus time: requests by when they arrived, lends
 * by handover, returns by when they came back, cancellations by when they
 * were closed. Every month from the first record to this one appears, quiet
 * months included, newest first.
 */
export function monthly(requests: Req[], lendings: Lend[]): MonthRow[] {
  const rows = new Map<string, MonthRow>();
  const row = (m: string) => {
    let r = rows.get(m);
    if (!r) {
      r = { month: m, label: monthLabel(m, "long"), short: monthLabel(m, "short"),
        requests: 0, lends: 0, returns: 0, cancelled: 0, rejected: 0 };
      rows.set(m, r);
    }
    return r;
  };

  for (const r of requests) {
    const m = monthOf(r.created_at);
    if (m) row(m).requests++;
    const c = monthOf(r.closed_at);
    if (c && r.status === "cancelled") row(c).cancelled++;
    if (c && r.status === "rejected") row(c).rejected++;
  }
  for (const l of lendings) {
    const m = monthOf(l.lent_at);
    if (m) row(m).lends++;
    const b = monthOf(l.returned_at);
    if (b) row(b).returns++;
  }

  const current = siteToday().slice(0, 7);
  const first = [...rows.keys(), current].sort()[0];
  // Fill the gaps so a quiet month shows as zero rather than vanishing.
  for (let m = first; m <= current; m = addDays(`${m}-28`, 7).slice(0, 7)) row(m);

  return [...rows.values()].sort((a, b) => b.month.localeCompare(a.month));
}

export type ReasonCount = { reason: string; count: number };

/** Why requests didn't go ahead, most common first. */
export function reasons(requests: Req[]): { cancelled: ReasonCount[]; rejected: ReasonCount[] } {
  const tally = (status: string) => {
    const m = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== status) continue;
      const k = r.close_reason || "No reason recorded";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
  };
  return { cancelled: tally("cancelled"), rejected: tally("rejected") };
}
