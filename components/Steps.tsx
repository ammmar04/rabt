const STEPS = [
  ["01", "Browse", "Look through what's on the rail and find something for the occasion."],
  ["02", "Request", "Pick a time to collect it. Each piece is listed in its own size."],
  ["03", "Collect", "We message you with where and when to pick it up."],
  ["04", "Return", "We agree a return date at handover. Bring it back then — we do the cleaning."],
];

export default function Steps() {
  return (
    <div className="steps">
      {STEPS.map(([n, title, body], i) => (
        <div className="hstep reveal" data-d={(i % 4) + 1} key={n}>
          <span className="hstep__n">{n}</span>
          <h3>{title}</h3>
          <p>{body}</p>
        </div>
      ))}
    </div>
  );
}
