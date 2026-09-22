import type { CSSProperties } from "react";
import type { ListItem } from "@/lib/content";

/**
 * Columns for a row of tiles whose count the team can change in Content:
 * up to four across, and the last tile stretches so a short final row never
 * leaves an empty cell.
 */
function layout(n: number) {
  const cols = n <= 4 ? Math.max(n, 1) : n % 3 === 0 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  return { cols, lastSpan: cols * rows - n + 1 };
}

/** The ruled tile row used for steps, principles and "what we need". */
export default function Steps({ steps, numbered = true }: { steps: ListItem[]; numbered?: boolean }) {
  const { cols, lastSpan } = layout(steps.length);
  return (
    <div className="steps" style={{ "--cols": cols } as CSSProperties}>
      {steps.map((s, i) => (
        <div
          className="hstep reveal"
          data-d={(i % 4) + 1}
          key={`${i}-${s.title}`}
          style={i === steps.length - 1 && lastSpan > 1 ? { gridColumn: `span ${lastSpan}` } : undefined}
        >
          {numbered && <span className="hstep__n">{String(i + 1).padStart(2, "0")}</span>}
          <h3>{s.title}</h3>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  );
}
