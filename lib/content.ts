/**
 * Editable website copy.
 *
 * Every page the team can edit in Admin → Content is declared here once: its
 * fields, their labels and limits, and the original wording. The admin editor
 * is generated from this list and the public pages read from it, so adding a
 * page (or a field) means adding an entry below — no new admin screen, no new
 * table.
 *
 * Only wording that differs from the original is stored in the database. A
 * field nobody has touched keeps following the text written here.
 */
import { cleanLine, cleanText, type FieldErrors } from "./validate";

export type ListItem = { title: string; body: string };

type Base = { key: string; label: string; hint?: string; optional?: boolean };

export type Field =
  | (Base & { kind: "line"; default: string; max: number })
  | (Base & { kind: "text"; default: string; max: number; rows?: number })
  | (Base & {
      kind: "list"; default: ListItem[]; minItems: number; maxItems: number;
      titleLabel: string; bodyLabel: string; titleMax: number; bodyMax: number;
    });

export type Section = { title: string; fields: Field[] };

export type PageDef = {
  page: string;
  label: string;
  /** Where it appears, for the "view page" link. */
  path: string;
  summary: string;
  sections: Section[];
};

const line = (key: string, label: string, def: string, max = 120, extra: Partial<Base> = {}): Field =>
  ({ key, label, kind: "line", default: def, max, ...extra });
const text = (key: string, label: string, def: string, max = 1200, extra: Partial<Base> & { rows?: number } = {}): Field =>
  ({ key, label, kind: "text", default: def, max, ...extra });

export const PAGES: PageDef[] = [
  {
    page: "home",
    label: "Home",
    path: "/",
    summary: "The front page: the opening lines, section headings and the short introduction to Rabt.",
    sections: [
      {
        title: "Top of the page",
        fields: [
          line("hero_eyebrow", "Small label above the heading", "The campus wardrobe", 60),
          line("hero_heading", "Heading", "Borrow what you need.", 80),
          text("hero_lead", "Line under the heading", "Formal clothing, free to borrow, open to everyone.", 200, {
            rows: 2, hint: "Keep it short — on a phone the browse button sits just below this.",
          }),
          line("hero_point", "Second tick point", "Collect on campus, return when you're done", 70, {
            optional: true, hint: "Shown next to the live count of pieces available. Leave blank to hide it.",
          }),
        ],
      },
      {
        title: "Sections",
        fields: [
          line("browse_eyebrow", "Categories — small label", "Browse by", 40),
          line("browse_heading", "Categories — heading", "Start with what you need.", 80),
          line("featured_eyebrow", "Available pieces — small label", "On the rail", 40),
          line("featured_heading", "Available pieces — heading", "Available right now.", 80),
          line("featured_empty", "When nothing is available", "Nothing on the rail just yet — check back shortly.", 140),
          line("steps_eyebrow", "Steps — small label", "How it works", 40),
          line("steps_heading", "Steps — heading", "Four steps, from rail to return.", 80, {
            hint: "The steps themselves are edited under How it works.",
          }),
        ],
      },
      {
        title: "About Rabt",
        fields: [
          line("idea_eyebrow", "Small label", "The idea", 40),
          line("idea_heading", "Heading", "A wardrobe nobody owns.", 80),
          text("idea_body", "Text",
            "Most of us need formal clothes a handful of times a year — an interview, a presentation, a defence, anything with a dress code. Buying a suit for one of them rarely makes sense, and borrowing from a friend depends on having a friend your size.\n\n" +
            "Rabt is the in-between: a shared rail that anyone on campus can use, kept going by people passing on things they no longer wear. You borrow it, you return it, someone else borrows it next.",
            1200, { rows: 6, hint: "Leave a blank line between paragraphs." }),
          line("idea_link", "Link text", "More about Rabt", 40),
        ],
      },
      {
        title: "Contribute",
        fields: [
          line("contribute_eyebrow", "Small label", "Contribute", 40),
          line("contribute_heading", "Heading", "Have something worth sharing?", 80),
          text("contribute_body", "Text",
            "A blazer that no longer fits, a shirt you have not worn in two years, a suit from a wedding. If it is clean and in good condition, it will get used.",
            600, { rows: 3 }),
        ],
      },
    ],
  },
  {
    page: "catalogue",
    label: "Catalogue",
    path: "/catalogue",
    summary: "The heading and introduction above the wardrobe, and the message shown when a search finds nothing.",
    sections: [
      {
        title: "Catalogue page",
        fields: [
          line("eyebrow", "Small label above the heading", "The wardrobe", 60, {
            optional: true, hint: "Shown in small capitals. Leave blank to hide it.",
          }),
          line("heading", "Heading", "Everything on the rail.", 120),
          text("intro", "Text under the heading",
            "Borrow any of it, free. Items already out are still listed, with the date they are due back.",
            400, { optional: true, rows: 3, hint: "A sentence or two. Leave blank to hide it." }),
          line("empty", "When a search or filter finds nothing", "Nothing matches that just yet.", 200, {
            hint: "Shown in place of the grid, with a button to clear the filters.",
          }),
        ],
      },
    ],
  },
  {
    page: "about",
    label: "About",
    path: "/about",
    summary: "Rabt as a whole — the umbrella initiative — and the wardrobe as its first initiative.",
    sections: [
      {
        title: "Top of the page",
        fields: [
          line("eyebrow", "Small label", "About Rabt", 40),
          line("heading", "Heading", "Rabt is built on connection.", 100),
          text("lead", "Introduction",
            "Rabt — ربط — means connection. It is a community initiative on campus, built around a simple idea: when people share what they have, everyone has more to draw on.",
            500, { rows: 3 }),
        ],
      },
      {
        title: "What Rabt is",
        fields: [
          line("intro_eyebrow", "Small label", "What Rabt is", 40),
          line("intro_heading", "Heading", "An umbrella for shared things.", 100),
          text("intro_body", "Text",
            "Rabt brings people on campus together around practical, shared resources — things that are useful to many people, owned by no one in particular, and kept going by the community that uses them.\n\n" +
            "Each Rabt initiative works the same way: open to everyone, simple to use, and handed on in good shape so it keeps working year after year.",
            1200, { rows: 6, hint: "Leave a blank line between paragraphs." }),
        ],
      },
      {
        title: "The first initiative",
        fields: [
          line("first_eyebrow", "Small label", "Our first initiative", 40),
          line("first_heading", "Heading", "The Rabt wardrobe.", 100),
          text("first_body", "Text",
            "The first thing Rabt has built is a shared wardrobe of professional attire: suits, blazers, collared shirts and formal trousers, lent free of charge for interviews, presentations, defences and anything with a dress code.\n\n" +
            "Everything on the rail was passed on by someone on campus — a blazer outgrown, a suit worn once, a shirt that never got used. Now it stays in circulation instead of in a cupboard.",
            1200, { rows: 6, hint: "Leave a blank line between paragraphs." }),
        ],
      },
      {
        title: "How Rabt works",
        fields: [
          line("values_eyebrow", "Small label", "How Rabt works", 40),
          line("values_heading", "Heading", "The same principles, whatever we build.", 100),
          {
            key: "values", label: "Principles", kind: "list", minItems: 1, maxItems: 6,
            titleLabel: "Principle", bodyLabel: "Explanation", titleMax: 60, bodyMax: 300,
            default: [
              { title: "Open to everyone", body: "Every Rabt initiative is for the whole campus community, and works the same way for everyone who uses it." },
              { title: "Shared, not owned", body: "What Rabt looks after belongs to the community. People contribute what they can, and everyone gets to use it." },
              { title: "Built to be handed on", body: "Rabt is looked after by whoever is running it each year, and everything it builds is designed to keep working when they hand it on." },
            ],
          },
        ],
      },
      {
        title: "What comes next",
        fields: [
          line("next_eyebrow", "Small label", "What comes next", 40),
          line("next_heading", "Heading", "The wardrobe is where Rabt starts.", 100),
          text("next_body", "Text",
            "The same approach — share what we have, make it easy to use, keep it going together — can work for much more than clothing. Rabt will grow into new initiatives as the community does.\n\n" +
            "If you have an idea for what Rabt could share next, or would like to help build it, we would love to hear from you.",
            1200, { rows: 5, hint: "Leave a blank line between paragraphs." }),
          line("cta_heading", "Closing heading", "Have a look at what is on the rail.", 100),
        ],
      },
    ],
  },
  {
    page: "how-it-works",
    label: "How it works",
    path: "/how-it-works",
    summary: "The steps (also shown on the home page) and the questions and answers.",
    sections: [
      {
        title: "Top of the page",
        fields: [
          line("eyebrow", "Small label", "How it works", 40),
          line("heading", "Heading", "Borrow something in about two minutes.", 100),
          text("lead", "Introduction",
            "Find a piece in your size, send a request, and we'll be in touch to confirm it and arrange collection.",
            400, { rows: 2 }),
        ],
      },
      {
        title: "Steps",
        fields: [
          {
            key: "steps", label: "Steps", kind: "list", minItems: 2, maxItems: 6,
            titleLabel: "Step", bodyLabel: "Description", titleMax: 40, bodyMax: 200,
            hint: "Numbered automatically. Also shown on the home page.",
            default: [
              { title: "Browse", body: "Look through what's on the rail and find something for the occasion." },
              { title: "Request", body: "Send a request and pick a time to collect it. Each piece is listed in its own size." },
              { title: "Confirm & collect", body: "We contact you to confirm your request, then you pick it up on campus." },
              { title: "Return", body: "We agree a return date at handover. Bring it back then — we do the cleaning." },
            ],
          },
        ],
      },
      {
        title: "Questions and answers",
        fields: [
          line("faq_eyebrow", "Small label", "Good to know", 40),
          line("faq_heading", "Heading", "The details.", 80),
          {
            key: "faqs", label: "Questions", kind: "list", minItems: 0, maxItems: 15,
            titleLabel: "Question", bodyLabel: "Answer", titleMax: 120, bodyMax: 600,
            default: [
              { title: "When is my borrowing confirmed?", body: "Once we've been in touch. Sending a request holds the piece for you; we then contact you on the WhatsApp number, email or account you gave us to confirm it and arrange collection." },
              { title: "How long can I keep something?", body: "Up to a week as standard. We agree the exact return date and time with you when you collect it, so you do not have to work it out in advance. Need longer? Say so at handover — it is usually fine." },
              { title: "What if it does not fit?", body: "Message us and we will swap it for another size if we have one, or find you something similar. Nothing is final until it actually fits." },
              { title: "Do I need to clean it before returning?", body: "No. Return it as-is and we handle the cleaning. That cost is what contributions go towards." },
              { title: "Is there any cost?", body: "No. Borrowing is free. There is an optional contribution at the end of the request if you want to chip in towards cleaning and repairs, and skipping it changes nothing." },
              { title: "Who can use Rabt?", body: "Anyone on campus. Find something you like, send a request, and we'll take it from there." },
              { title: "Can I borrow two things at once?", body: "Yes, but as two separate requests — every garment is listed and tracked on its own. Just go through the flow again for the second item." },
            ],
          },
          text("note", "Note under the questions",
            "Still unsure about something? Ask us before you request — we're happy to help.",
            300, { optional: true, rows: 2 }),
        ],
      },
    ],
  },
  {
    page: "contribute",
    label: "Contribute",
    path: "/contribute",
    summary: "What the wardrobe needs, how to hand clothing over, and the contact section.",
    sections: [
      {
        title: "Top of the page",
        fields: [
          line("eyebrow", "Small label", "Contribute", 40),
          line("heading", "Heading", "Have something worth sharing?", 100),
          text("lead", "Introduction",
            "If it is clean, in good condition and someone would be glad to wear it to an interview, it belongs on the rail.",
            400, { rows: 2 }),
        ],
      },
      {
        title: "What gets used most",
        fields: [
          line("takes_eyebrow", "Small label", "What gets used most", 40),
          line("takes_heading", "Heading", "Things we are always short of.", 100),
          {
            key: "takes", label: "Items", kind: "list", minItems: 1, maxItems: 8,
            titleLabel: "Item", bodyLabel: "Detail", titleMax: 40, bodyMax: 160,
            default: [
              { title: "Suits", body: "Two- or three-piece, any conventional colour." },
              { title: "Blazers", body: "Standalone jackets get borrowed constantly." },
              { title: "Collared shirts", body: "Especially white and light blue, all sizes." },
              { title: "Formal trousers", body: "Flat-front or pleated, hemmed or unhemmed." },
            ],
          },
        ],
      },
      {
        title: "Handing it over",
        fields: [
          line("handover_eyebrow", "Small label", "Handing it over", 40),
          line("handover_heading", "Heading", "Three things, then it is done.", 100),
          {
            key: "handover", label: "Steps", kind: "list", minItems: 1, maxItems: 6,
            titleLabel: "Step", bodyLabel: "Description", titleMax: 60, bodyMax: 300,
            hint: "Numbered automatically.",
            default: [
              { title: "Message us", body: "Tell us roughly what you have and the size. A photo helps but is not necessary." },
              { title: "We agree a time", body: "Somewhere on campus that suits you. It takes a minute." },
              { title: "We take it from there", body: "We clean it, measure it, photograph it and add it to the rail. If it turns out not to be usable we will pass it on somewhere it will be." },
            ],
          },
        ],
      },
      {
        title: "Getting in touch",
        fields: [
          line("contact_label", "Small label", "Get in touch", 40),
          text("contact_missing", "Shown if no WhatsApp or email is set in Settings",
            "Contact details are being set up — check back shortly, or reach out to the Rabt team on campus.",
            300, { rows: 2 }),
          text("money_note", "Note at the bottom",
            "Not able to contribute clothing? Contributions towards cleaning and repairs are just as useful, and entirely optional at every step.",
            300, { optional: true, rows: 2 }),
        ],
      },
    ],
  },
  {
    page: "borrowing",
    label: "Borrowing",
    path: "/catalogue",
    summary: "The wording in the request steps, the confirmation after sending a request, and the line under the Borrow button.",
    sections: [
      {
        title: "Step 1 — collection time",
        fields: [
          line("when_heading", "Heading", "When would you like to collect it?", 100),
          text("when_intro", "Text",
            "Pick a day this coming week and a time. We'll confirm the exact collection point when we contact you, and agree your return date at handover.",
            400, { rows: 3 }),
          text("slot_note", "Note under the times",
            "None of these times work for you? No worries — just let us know your preferred time when we reach out to confirm your request.",
            300, { optional: true, rows: 2 }),
        ],
      },
      {
        title: "Step 2 — contact",
        fields: [
          line("contact_heading", "Heading", "How should we reach you?", 100),
          text("contact_intro", "Text", "We'll use this to confirm your request and arrange collection.", 300, { rows: 2 }),
        ],
      },
      {
        title: "Step 3 — contribution and sending",
        fields: [
          line("contribute_heading", "Heading", "Want to contribute?", 100),
          text("contribute_lead", "Line under the heading", "Rabt is free to use, and it stays free whatever you choose here.", 300, { rows: 2 }),
          text("contribute_body", "Text",
            "If you'd like to chip in towards keeping the wardrobe in good condition, you can — entirely optional, and nothing changes if you skip it.",
            400, { rows: 3 }),
          text("send_notice", "Notice above the Send button",
            "Sending this request doesn't confirm your borrowing yet. We'll hold the piece for you and contact you on {method} — it's confirmed once we've confirmed it with you there.",
            400, { rows: 3, hint: "{method} is replaced with WhatsApp, email or their other account." }),
        ],
      },
      {
        title: "After sending",
        fields: [
          line("done_heading", "Heading", "Request sent — not confirmed yet.", 100),
          text("done_body", "Text",
            "We're holding the piece for you. We'll contact you on {method} at {contact} to confirm your request and your collection on {date} at {time}. Your borrowing is confirmed once we've confirmed it with you.",
            500, { rows: 4, hint: "{method}, {contact}, {date} and {time} are filled in from their request." }),
          text("done_after", "Second line", "We'll agree a return date with you when you pick it up — no need to decide now.", 300, { optional: true, rows: 2 }),
        ],
      },
      {
        title: "Item page",
        fields: [
          line("item_note", "Line under the Borrow button", "Free to borrow. Send a request and we'll be in touch to confirm it.", 160, { optional: true }),
        ],
      },
    ],
  },
  {
    page: "privacy",
    label: "Privacy",
    path: "/privacy",
    summary: "The privacy note: what Rabt records and how it is used.",
    sections: [
      {
        title: "Privacy note",
        fields: [
          line("eyebrow", "Small label", "Privacy", 40),
          line("heading", "Heading", "What Rabt keeps.", 100),
          text("lead", "Introduction", "Short version: what you borrowed and when, and a way to contact you about it.", 300, { rows: 2 }),
          {
            key: "sections", label: "Sections", kind: "list", minItems: 1, maxItems: 10,
            titleLabel: "Heading", bodyLabel: "Text", titleMax: 80, bodyMax: 800,
            default: [
              { title: "What we record", body: "The piece you asked for, the collection day and time you chose, the contact detail you gave us, and optionally a name you would like us to use. When you collect and return something, we note the dates." },
              { title: "Who can see it", body: "The small team running Rabt, to arrange your borrowing and look after the wardrobe. We do not share your details with anyone else." },
              { title: "How long we keep it", body: "We keep a record of requests and borrowings — what was borrowed and when — so we can look after the wardrobe and understand how it is used over time. Your contact detail is only used to arrange your borrowing, and we will remove it whenever you ask." },
              { title: "On this website", body: "Your borrowing on the My Rabt page is matched using reference numbers stored in your own browser. No advertising or tracking cookies are set." },
            ],
          },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------- reading */

export function findPage(page: string): PageDef | undefined {
  return PAGES.find((p) => p.page === page);
}

export function fieldsOf(page: PageDef): Field[] {
  return page.sections.flatMap((s) => s.fields);
}

/** The database key for one field. */
export const storedKey = (page: string, key: string) => `${page}.${key}`;

export function parseList(raw: string): ListItem[] | null {
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    return v
      .filter((x) => x && typeof x === "object")
      .map((x) => ({ title: String(x.title ?? ""), body: String(x.body ?? "") }));
  } catch {
    return null;
  }
}

/** The value of a field as the editor handles it: text, or JSON for lists. */
export function defaultValue(f: Field): string {
  return f.kind === "list" ? JSON.stringify(f.default) : f.default;
}

export type PageCopy = {
  /** A line or text field, as written. */
  t: (key: string) => string;
  /** A text field split on blank lines. */
  paras: (key: string) => string[];
  list: (key: string) => ListItem[];
};

/** Merges stored wording over the originals for one page. */
export function resolvePage(pageName: string, stored: Record<string, string>): PageCopy {
  const page = findPage(pageName);
  if (!page) throw new Error(`Unknown content page "${pageName}"`);
  const byKey = new Map(fieldsOf(page).map((f) => [f.key, f]));

  const field = (key: string, kind?: Field["kind"]) => {
    const f = byKey.get(key);
    if (!f) throw new Error(`Unknown content field "${pageName}.${key}"`);
    if (kind === "list" && f.kind !== "list") throw new Error(`"${pageName}.${key}" is not a list`);
    return f;
  };
  const raw = (f: Field) => stored[storedKey(pageName, f.key)];

  return {
    t: (key) => {
      const f = field(key);
      const v = raw(f);
      return v !== undefined ? v : (f.kind === "list" ? "" : f.default);
    },
    paras: (key) => {
      const f = field(key);
      const v = raw(f) ?? (f.kind === "list" ? "" : f.default);
      return v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    },
    list: (key) => {
      const f = field(key, "list") as Extract<Field, { kind: "list" }>;
      const v = raw(f);
      return (v !== undefined ? parseList(v) : null) ?? f.default;
    },
  };
}

/* ----------------------------------------------------------- validating */

/**
 * Checks everything submitted for one page against its definitions. Used by
 * the editor before saving and by the server when it does.
 */
export function validatePage(
  page: PageDef,
  get: (key: string) => string | null
): { values: Record<string, string>; errors: FieldErrors } {
  const values: Record<string, string> = {};
  const errors: FieldErrors = {};

  for (const f of fieldsOf(page)) {
    const raw = get(f.key);
    if (raw === null) continue; // not part of this submission

    if (f.kind === "list") {
      const items = parseList(raw);
      if (!items) { errors[f.key] = `${f.label} could not be read — try again.`; continue; }
      const cleaned = items
        .map((i) => ({ title: cleanLine(i.title), body: cleanText(i.body) }))
        .filter((i) => i.title || i.body);
      const problem =
        cleaned.length < f.minItems ? `Keep at least ${f.minItems} ${f.minItems === 1 ? "entry" : "entries"}.`
        : cleaned.length > f.maxItems ? `There can be at most ${f.maxItems} entries.`
        : cleaned.map((i, n) =>
            !i.title ? `${f.titleLabel} ${n + 1} is empty — fill it in or remove the entry.`
            : !i.body ? `${f.bodyLabel} ${n + 1} is empty — fill it in or remove the entry.`
            : i.title.length > f.titleMax ? `${f.titleLabel} ${n + 1} can be at most ${f.titleMax} characters.`
            : i.body.length > f.bodyMax ? `${f.bodyLabel} ${n + 1} can be at most ${f.bodyMax} characters.`
            : ""
          ).find(Boolean);
      if (problem) errors[f.key] = problem;
      else values[f.key] = JSON.stringify(cleaned);
      continue;
    }

    const v = f.kind === "text" ? cleanText(raw) : cleanLine(raw);
    if (!v && !f.optional) errors[f.key] = `${f.label} can't be empty — use "Restore original" to go back to the original wording.`;
    else if (v.length > f.max) errors[f.key] = `${f.label} can be at most ${f.max} characters (currently ${v.length}).`;
    else values[f.key] = v;
  }
  return { values, errors };
}
