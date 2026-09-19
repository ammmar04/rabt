-- Rabt schema. Runs on Neon Postgres in production and PGlite locally.
--
-- Every physical garment is one row in `items`: one size, one colour, one
-- availability state, one borrowing history. Two suits of the same cut in
-- different sizes are two rows, not one row with two sizes.

CREATE TABLE IF NOT EXISTS categories (
  slug      TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  singular  TEXT NOT NULL,
  blurb     TEXT NOT NULL DEFAULT '',
  image     TEXT NOT NULL DEFAULT '',
  sort      INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL REFERENCES categories(slug),
  type          TEXT NOT NULL DEFAULT '',
  colour        TEXT NOT NULL DEFAULT '',
  colour_hex    TEXT NOT NULL DEFAULT '#8A8A82',
  size          TEXT NOT NULL DEFAULT '',          -- one physical garment, one size
  fit           TEXT NOT NULL DEFAULT '',
  condition     TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'available', -- available | borrowed | soon
  available_from DATE,
  description   TEXT NOT NULL DEFAULT '',
  measurements  TEXT NOT NULL DEFAULT '',          -- "Chest: 38-42 in\nSleeve: 24 in"
  care          TEXT NOT NULL DEFAULT '',
  image_url     TEXT NOT NULL DEFAULT '',
  detail_url    TEXT NOT NULL DEFAULT '',
  archived      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Databases created before each garment became its own row: add the column so
-- the split in lib/migrate.ts has somewhere to write.
ALTER TABLE items ADD COLUMN IF NOT EXISTS size TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS requests (
  ref             TEXT PRIMARY KEY,
  item_id         TEXT,
  item_name       TEXT NOT NULL DEFAULT '',
  size            TEXT NOT NULL DEFAULT '',
  requested_date  TEXT NOT NULL DEFAULT '',        -- collection day the borrower picked
  requested_time  TEXT NOT NULL DEFAULT '',
  contact_method  TEXT NOT NULL DEFAULT '',
  contact_value   TEXT NOT NULL DEFAULT '',
  person_name     TEXT NOT NULL DEFAULT '',
  contribution    TEXT NOT NULL DEFAULT '',
  status          INT  NOT NULL DEFAULT 0,
  return_date     DATE,                            -- agreed at handover, not at request
  return_time     TEXT NOT NULL DEFAULT '',
  returned_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Existing databases predate the handover return date.
ALTER TABLE requests ADD COLUMN IF NOT EXISTS return_date DATE;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS return_time TEXT NOT NULL DEFAULT '';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS settings (
  id             INT PRIMARY KEY DEFAULT 1,
  whatsapp       TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  instagram      TEXT NOT NULL DEFAULT '',
  pay_title      TEXT NOT NULL DEFAULT 'Bank transfer',
  pay_line1      TEXT NOT NULL DEFAULT '',
  pay_line2      TEXT NOT NULL DEFAULT '',
  pay_line3      TEXT NOT NULL DEFAULT '',
  slots          TEXT NOT NULL DEFAULT '10:00,11:00,12:00,14:00,15:00,16:00,17:00',
  closed_days    TEXT NOT NULL DEFAULT '0',
  CONSTRAINT settings_singleton CHECK (id = 1)
);

-- Catalogue page copy, edited in admin rather than in the source.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS cat_eyebrow TEXT NOT NULL DEFAULT 'The wardrobe';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS cat_heading TEXT NOT NULL DEFAULT 'Everything on the rail.';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS cat_intro TEXT NOT NULL DEFAULT 'Borrow any of it, free. Items already out are still listed, with the date they are due back.';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS cat_empty TEXT NOT NULL DEFAULT 'Nothing matches that just yet.';

CREATE INDEX IF NOT EXISTS items_category_idx ON items (category);
CREATE INDEX IF NOT EXISTS items_status_idx   ON items (status);
CREATE INDEX IF NOT EXISTS requests_created_idx ON requests (created_at DESC);
CREATE INDEX IF NOT EXISTS requests_return_idx  ON requests (return_date);
