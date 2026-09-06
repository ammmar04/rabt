const STEPS = [
  ["01", "Browse", "Look through what's on the rail and find something for the occasion."],
  ["02", "Request", "Pick your size and a time that works for you this week."],
  ["03", "Collect", "We message you with where and when to pick it up."],
  ["04", "Return", "Bring it back when you're done. We take care of the cleaning."],
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
