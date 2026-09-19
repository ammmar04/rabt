# Rabt

*A wardrobe we share.*

A shared wardrobe of formal clothing for a university community. Anyone can borrow —
no eligibility check, no proof of need, no explaining why. Built to read as a
well-designed clothing service that happens to be free, not as a charity portal.

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
| Add a garment | **Items → Add item**, drag in a photo, fill the form, save. It is live immediately. |
| Edit a garment | **Items →** click its name. |
| Remove a garment | **Items → Remove.** It disappears from the public site; past requests keep their history. |
| Mark something borrowed / back | **Items →** the *Set availability* dropdown. Saves on change. |
| Record a handover | **Requests →** fill in *Expected return* (date and time) and save. That marks the request borrowed and starts tracking the return. |
| Move a request along | **Requests →** the *Status* dropdown (Request received → … → Returned). The borrower's My Rabt page updates too. |
| See what is due back | **Returns.** Grouped into overdue, due today, due soon, no date yet and returned, with a reminder across the top of every admin page. |
| Take a garment back | **Returns → Mark returned.** The garment goes straight back on the rail. |
| Reword the catalogue page | **Content.** Heading, the text under it and the no-results message. Clear a field to get the original wording back. |
| Change contact or payment details | **Settings.** These feed the public site directly. |

Item IDs (`R-206`) are assigned automatically per category.

**One row per garment.** A suit in size 40 and the same suit in size 42 are two
separate items with their own id, availability and borrowing history — not one
item with a list of sizes. Adding a second size means adding a second item.

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
  borrow/[id]/            the 3-step request flow (collect, contact, contribute)
  dashboard/              My Rabt — borrower's own requests
  how-it-works, about, contribute, privacy
  admin/                  password-gated portal
    page.tsx              requests, status, handover return date
    returns/              what is due back, grouped by how soon
    items/                list, add, edit
    content/              catalogue page wording
    settings/             contact, payment, collection times
  actions.ts              public server actions (submit + look up requests)
  admin/actions.ts        admin server actions (all call requireAdmin)

lib/
  db.ts                   Neon in production, PGlite locally
  queries.ts              every SQL query lives here
  auth.ts                 admin password + signed session cookie
  storage.ts              Vercel Blob, or local folder in dev
  seed.ts                 first-run data from data/inventory.json
  migrate.ts              splits pre-existing multi-size items into one row each
  types.ts                shared types + helpers

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
  reference numbers in the browser and asking the server for just those. Nothing
  identifying is stored, and there are no public lists of who borrowed what.
- **Unavailable items stay visible** so people can see the whole wardrobe, but are
  clearly marked and cannot be requested.

## Photos

Items added through the portal use real uploaded photos (JPG, PNG, WebP or SVG, up
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
