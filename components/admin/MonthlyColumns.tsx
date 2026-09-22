import type { MonthRow } from "@/lib/history";

/**
 * One measure per chart (requests, or lends), month by month, oldest on the
 * left. Two measures get two charts on a shared scale rather than two colours
 * in one, so they compare honestly and stay in Rabt's olive. Each column shows
 * its exact value on hover or keyboard focus, and the table below the charts
 * carries every number.
 */
export default function MonthlyColumns({
  title, rows, pick, unit, max,
}: {
  title: string;
  rows: MonthRow[];
  pick: (r: MonthRow) => number;
  unit: [string, string];
  /** Shared across the small multiples so heights compare. */
  max: number;
}) {
  const top = Math.max(1, max);
  const latest = rows[rows.length - 1];
  const peak = rows.reduce((a, b) => (pick(b) > pick(a) ? b : a), rows[0]);
  const noun = (n: number) => `${n} ${n === 1 ? unit[0] : unit[1]}`;

  return (
    <figure className="mc">
      <figcaption className="mc__t">
        <span>{title}</span>
        <span className="mc__now">{latest ? `${noun(pick(latest))} this month` : ""}</span>
      </figcaption>
      <div className="mc__plot">
        <span className="mc__tick mc__tick--top">{top}</span>
        <span className="mc__tick mc__tick--zero">0</span>
        <div className="mc__cols">
          {rows.map((r) => {
            const v = pick(r);
            const labelled = v > 0 && (r === peak || r === latest);
            return (
              <div className="mc__col" key={r.month} tabIndex={0} aria-label={`${r.label}: ${noun(v)}`}>
                <div className="mc__bar-wrap">
                  {labelled && <span className="mc__val">{v}</span>}
                  <span className="mc__bar" style={{ height: `${(v / top) * 100}%` }} data-zero={v === 0 ? "1" : "0"} />
                </div>
                <span className="mc__x">{r.short}</span>
                <span className="mc__tip" role="tooltip">
                  <strong>{v}</strong> {v === 1 ? unit[0] : unit[1]}<br />{r.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </figure>
  );
}

/** Magnitude by reason — one colour, value at the tip. */
export function ReasonBars({ rows, empty }: { rows: { reason: string; count: number }[]; empty: string }) {
  if (!rows.length) return <p className="muted" style={{ fontSize: "var(--fs-small)" }}>{empty}</p>;
  const top = Math.max(...rows.map((r) => r.count));
  return (
    <ul className="rb">
      {rows.map((r) => (
        <li key={r.reason} className="rb__row">
          <span className="rb__l">{r.reason}</span>
          <span className="rb__track">
            <span className="rb__bar" style={{ width: `${(r.count / top) * 100}%` }} />
            <span className="rb__v">{r.count}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
