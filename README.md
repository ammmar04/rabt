# Rabt

*A wardrobe we share.*

A shared wardrobe of formal clothing for a university community. Anyone can borrow —
no eligibility check, no proof of need, no explaining why. Built to read as a
well-designed clothing service that happens to be free, not as a charity portal.

**At a glance:** This is a full-stack Next.js application with a public catalogue,
borrowing flow, and an admin workspace for inventory, requests, returns, and
reporting. The data layer uses Postgres in production and PGlite for local
development, so the project can be explored without cloud credentials.

Next.js app with a real database, photo uploads and an admin portal, so the team
running it can add, edit and remove items without touching code or redeploying.

---

## Running it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

That is genuinely all — no database to provision. With no `DATABASE_URL` set the app
runs on **PGlite** (Postgres in-process, stored in `./.data`) and seeds itself from
`data/inventory.json`. Photos you upload go into `public/uploads`.

The admin portal is at **/admin**. Locally, with no `ADMIN_PASSWORD` set, the
password is `rabt-dev`.

## How the team manages the wardrobe

Everything happens at **/admin** — no spreadsheets, no code, no redeploys.

| To… | Do this |
|---|---|
| Answer a new request | **Requests.** A request puts its garment **on hold** straight away, so nobody else can request it. Use the WhatsApp, Call or Email buttons on the card to contact the borrower, then **Mark confirmed**. The request is only a confirmed booking once you have done this. |
| Cancel a request | **Requests → Cancel request** (withdrawn, duplicate…) or **Couldn't fulfil** (no reply, didn't collect…), with a reason. The garment goes back on the rail unless its physical status was changed in the meantime. |
| Record a handover | **Requests → Hand over.** Enter the return date (and time, if agreed). This opens a lending record and marks the garment borrowed. |
| See what is due back | **Returns.** Grouped into overdue, due today, due soon, no date yet and returned, with a reminder across the top of every admin page. |
| Take a garment back | **Returns → Mark returned**, choosing where it goes next — back on the rail, out for wash or under repair. |
| Add a garment | **Items → Add item.** Give it your own ID (the number on its tag — it is checked for duplicates and can't be changed later), drag in a photo, fill the form, save. |
| Edit a garment | **Items →** click its name. |
| Change where a garment physically is | **Items →** the *Physical status* dropdown: Available, On hold, Borrowed, Under repair, Out for wash. Saves on change and never touches requests or lending history. |
| Remove a garment | **Items → Remove.** It disappears from the public site; its request and lending history stays. |
| See the whole history | **Request & Lending History.** Totals, month-by-month activity, reasons requests didn't go ahead, lends per garment, every lending and every request — with CSV downloads for reports. |
| Change website wording | **Content.** Pick a page (Home, Catalogue, About, How it works, Contribute, Borrowing, Privacy), edit, save. **Restore original** puts any field back. |
| Change contact or payment details | **Settings.** These feed the public site directly. |

**Two statuses, kept apart.** A *request* moves through Awaiting confirmation →
Confirmed → Borrowed → Returned (or Cancelled / Unfulfilled). A *garment* has a
physical status of its own. Requests change the garment's status as they go —
hold, handover, return — but the team can change a garment by hand at any time,
and a garment can only be requested while it is Available with no open request.

**One row per garment.** A suit in size 40 and the same suit in size 42 are two
separate items with their own ID, status and borrowing history — not one item
with a list of sizes. Adding a second size means adding a second item.

**History is permanent.** Every handover is its own lending record, kept with its
expected and actual return dates, whatever happens to the garment afterwards.
Closed requests — returned, cancelled or unfulfilled — are never deleted. To honour
a request to forget someone, use **Remove details** on their request in History:
the name and contact detail go, the record of what was borrowed and when stays.

**Adding an editable page.** Page wording is declared in `lib/content.ts`. Adding
a page (or a field) there is enough for it to appear under Content; the public
page reads it with `getPageCopy("<page>")`.

## Going live on Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. **Storage → Neon** — create a Postgres database. Vercel sets `DATABASE_URL`.
3. **Storage → Blob** — create a Blob store. Vercel sets `BLOB_READ_WRITE_TOKEN`.
4. **Settings → Environment Variables** — add `ADMIN_PASSWORD` (pick a strong one and
   share it with the team).
5. Deploy.

Tables are created on first request, and an empty database seeds itself from
`data/inventory.json` so the site is never blank on day one.

Two deliberate safety behaviours:

- With no `ADMIN_PASSWORD` in production, `/admin` is **locked**, not open.
- With no `DATABASE_URL` or Blob token in production, the app says so plainly rather
  than silently writing somewhere that will vanish.

## Structure

```
app/
  page.tsx                home
  catalogue/              browse + filters
  item/[id]/              item page
  borrow/[id]/            the 3-step request flow (collect, contact, contribute & send)
  dashboard/              My Rabt — borrower's own requests
  how-it-works, about, contribute, privacy
  admin/                  password-gated portal
    page.tsx              open requests: confirm, hand over, cancel
    returns/              what is out and due back, grouped by how soon
    items/                list, add, edit, physical status
    history/              Request & Lending History, plus CSV export
    content/              website wording, page by page
    settings/             contact, payment, collection times
  actions.ts              public server actions (submit + look up requests)
  admin/actions.ts        admin server actions (all call requireAdmin)

lib/
  db.ts                   Neon in production, PGlite locally
  queries.ts              every SQL query lives here
  auth.ts                 admin password + signed session cookie
  storage.ts              Vercel Blob, or local folder in dev
  seed.ts                 first-run data from data/inventory.json
  migrate.ts              brings older databases up to the current shape
  types.ts                shared types, statuses, dates (campus timezone)
  validate.ts, forms.ts   validation, shared by the forms and the server
  content.ts              every editable page, its fields and original wording
  history.ts              the history figures, counted from the records

db/schema.sql             tables (idempotent)
public/img/               the generated placeholder artwork
scripts/gen_images.py     regenerates that artwork if you want more of it
```

## Design notes

- **One item per request, by design.** There is no basket. Each garment has its own
  availability and preparation, so two garments means two requests.
- **Every physical garment is its own catalogue entry.** Sizes are not variants of
  one listing, so borrowing, availability, returns and history are tracked per
  garment rather than per design.
- **The return date is agreed at handover,** not when the request is made — a
  borrower rarely knows it yet. The team enters it when they hand the garment
  over, and it then drives the Returns view and the "expected back" note on the
  public item page.
- **No user accounts.** The borrower's dashboard works by remembering its own
  reference numbers in the browser and asking the server for just those.
- **Dates are campus dates.** "Due today", the collection days offered and every
  timestamp in admin are worked out in Pakistan time (`SITE_TZ` in `lib/types.ts`),
  whatever timezone the server runs in.
- **Unavailable items stay visible** so people can see the whole wardrobe, but are
  clearly marked and cannot be requested.

## Photos

Items added through the portal use real uploaded photos (JPG, PNG, WebP, AVIF or HEIC, up
to 8 MB). The pieces that shipped with the project use generated vector artwork so
the catalogue is never full of broken images before the team has photographed
anything. Replace them by editing each item and uploading a real photo.

## Swapping in the real logo

The header renders the wordmark as text. To use the actual logo, drop it at
`public/img/logo.svg` and replace the marked `<span className="brand__mark">` in
`components/Header.tsx` with:

```tsx
<img src="/img/logo.svg" alt="Rabt" />
```

## Notes for later

- Admin is a single shared password, which suits a small team. If you outgrow that
  and want per-person logins, `lib/auth.ts` is the only file that needs replacing
  (Clerk drops in cleanly here).
- `data/inventory.json` is only a first-run seed. Once the database has data, it is
  ignored — the database is the source of truth.
