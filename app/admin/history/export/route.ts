import { isSignedIn } from "@/lib/auth";
import { getLendingHistory, getRequestHistory } from "@/lib/queries";
import { formatDateTime, requestLabel, siteToday } from "@/lib/types";

/**
 * CSV downloads of the full history, for impact reports and spreadsheets.
 * Route handlers sit outside the admin layout, so this checks the session
 * itself.
 */
export async function GET(request: Request) {
  if (!(await isSignedIn())) return new Response("Sign in first.", { status: 401 });

  const type = new URL(request.url).searchParams.get("type");
  let header: string[];
  let rows: (string | number | null | undefined)[][];

  if (type === "requests") {
    const all = await getRequestHistory();
    header = [
      "Reference", "Submitted", "Item ID", "Garment", "Size", "Requester", "Contact method",
      "Contact", "Collection date", "Collection time", "Contribution", "Status", "Reason",
      "Note", "Confirmed", "Closed", "Lent", "Expected return", "Expected return time", "Returned",
    ];
    rows = all.map((r) => [
      r.ref, formatDateTime(r.created_at), r.item_id, r.item_name, r.size, r.person_name,
      r.contact_method, r.contact_value, r.requested_date, r.requested_time, r.contribution,
      requestLabel(r.status), r.close_reason, r.close_note, formatDateTime(r.confirmed_at),
      formatDateTime(r.closed_at), formatDateTime(r.lent_at), r.due_date, r.due_time,
      formatDateTime(r.returned_at),
    ]);
  } else if (type === "lendings") {
    const all = await getLendingHistory();
    header = [
      "Lending", "Reference", "Item ID", "Garment", "Size", "Borrower", "Lent",
      "Expected return", "Expected return time", "Returned",
    ];
    rows = all.map((l) => [
      l.id, l.request_ref, l.item_id, l.item_name, l.item_size, l.borrower_name,
      formatDateTime(l.lent_at), l.due_date, l.due_time, formatDateTime(l.returned_at),
    ]);
  } else {
    return new Response("Ask for type=requests or type=lendings.", { status: 400 });
  }

  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? "" : String(v);
    // Spreadsheets run cells that start like a formula; neutralise them.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rabt-${type}-${siteToday()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
