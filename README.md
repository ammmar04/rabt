# Rabt

*A wardrobe we share.*

A shared wardrobe of formal clothing for a university community. Anyone can borrow —
no eligibility check, no proof of need, no explaining why. Built to read as a
well-designed clothing service that happens to be free, not as a charity portal.

Static site: plain HTML, CSS and vanilla JS. No build step, no framework, no backend
required to run.

---

## Before it goes live — things to replace

These are placeholders and **must be swapped for real values**:

| What | Where |
|---|---|
| WhatsApp number, email, Instagram handle | `data/inventory.json` → `config.contact` |
| Bank / payment details for contributions | `data/inventory.json` → `config.contribution.account` |
| The real Rabt logo | `assets/img/logo.svg` (placeholder wordmark) — see below |
| Collection time slots & closed days | `data/inventory.json` → `config.slots`, `config.closedDays` |
| Item photos | `assets/img/items/` — see "Imagery" below |

### Using the real logo

The header currently renders the wordmark as text so it uses the real webfont.
To drop in the actual logo, replace the marked `<span>` in `scripts/build_pages.py`
(function `brand()`) with:

```html
<img src="assets/img/logo.svg" alt="Rabt">
```

then re-run `python3 scripts/build_pages.py`. The CSS already sizes `.brand img`.

---

## Structure

```
index.html            Home — hero, categories, available now, how it works, contribute
catalogue.html        Full wardrobe + filters (type, size, availability, colour) + search
item.html?id=R-101    Item page — images, sizes, measurements, condition, Borrow CTA
borrow.html?id=R-101  The 4-step request flow
dashboard.html        My Rabt — current / previous borrowings with status
how-it-works.html     Four steps + practical questions
about.html            Why Rabt works the way it does
contribute.html       Contributing clothing
privacy.html          What is collected, and what deliberately is not
admin.html            Team view — inventory + incoming requests

data/inventory.json   Single source of truth: config, categories, items
data/sheets/*.csv     Column templates matching the Google Sheets backend
assets/css/styles.css Design system (all tokens in one :root)
assets/js/main.js     Source · assets/js/main.min.js is what pages load
assets/img/           All imagery, generated as SVG
scripts/              Generators for imagery and pages
```

## One item per request

There is deliberately **no shopping cart**. Each piece has its own availability and
preparation, so each borrowing is its own request. Wanting two things means going
through the flow twice. The UI uses familiar language ("Borrow") without a multi-item
checkout.

## The borrowing flow

1. **Size** — with a "not sure about your size?" helper
2. **When** — the coming seven days plus a time slot (closed days are disabled)
3. **Contact** — WhatsApp, email or a secondary account. Nothing else is asked for
4. **Contribute** — clearly optional, skippable, and stated as such

It ends with a reference number; the team confirms collection details over the chosen
contact method.

## Backend

For the MVP, Google Sheets is the operational database. `data/sheets/` contains the
column layout for the four sheets: **INVENTORY**, **REQUESTS**, **USERS**, **MAINTENANCE**.

Everything that would talk to a server goes through `store.saveRequest()` in
`assets/js/main.js`. To connect it:

1. Publish a Google Apps Script web app that appends a row to the REQUESTS sheet.
2. Set `ENDPOINT` at the top of `assets/js/main.js` to its URL.
3. Re-minify (below).

Requests then POST there as well as saving locally. Nothing else changes — the site is
structured so a real backend can replace the sheet later without a redesign.

Until then, `admin.html` reads the catalogue file and keeps request/availability
changes in the browser it is used in. It has **no authentication** — treat it as a
working shell, and put it behind real auth before relying on it.

## Rebuilding

```bash
# after editing data/inventory.json
python3 scripts/gen_images.py      # regenerate all SVG imagery
python3 scripts/build_pages.py     # regenerate the HTML pages

# after editing assets/js/main.js
npx esbuild assets/js/main.js --minify --outfile=assets/js/main.min.js
```

## Imagery

All imagery is generated vector art (garments on hangers, drawn from the colour and
pattern in `inventory.json`) so nothing can 404 into a broken placeholder and the
whole set stays visually consistent. Files are tiny, which matters on phone data.

To use real photography instead, drop a `4:5` image at
`assets/img/items/<ITEM-ID>.svg|jpg` and adjust the extension in the `itemCard()` and
`initItem()` functions in `assets/js/main.js`.

## Local preview

```bash
python3 -m http.server 8124
# open http://localhost:8124
```

## Deploy

Zero-config static site — import the repo into Vercel (or any static host) with no
framework preset, build command or output directory.
