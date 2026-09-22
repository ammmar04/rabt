-- Rabt schema. Runs on Neon Postgres in production and PGlite locally.
--
-- Every physical garment is one row in `items`: one size, one colour, one
-- physical status. Requests move through their own lifecycle, separate from
-- where the garment physically is, and every handover is its own row in
-- `lendings`, so an item's history is never overwritten by its current state.
--
-- Statements here must stay idempotent: this file runs on every cold start.
-- Changes to existing data (type changes, moving columns) live in
-- lib/migrate.ts instead.

CREATE TABLE IF NOT EXISTS categories (
  slug      TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  singular  TEXT NOT NULL,
  blurb     TEXT NOT NULL DEFAULT '',
  image     TEXT NOT NULL DEFAULT '',
  sort      INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id            TEXT PRIMARY KEY,                  -- assigned by the team
  name          TEXT NOT NULL,
  category      TEXT NOT NULL REFERENCES categories(slug),
  type          TEXT NOT NULL DEFAULT '',
  colour        TEXT NOT NULL DEFAULT '',
  colour_hex    TEXT NOT NULL DEFAULT '#8A8A82',
  size          TEXT NOT NULL DEFAULT '',          -- one physical garment, one size
  fit           TEXT NOT NULL DEFAULT '',
  condition     TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'available', -- physical status, see ITEM_STATUSES
  hold_ref      TEXT,                              -- request holding it, while on_hold
  available_from DATE,                             -- expected back, when not available
  description   TEXT NOT NULL DEFAULT '',
  measurements  TEXT NOT NULL DEFAULT '',          -- "Chest: 38-42 in\nSleeve: 24 in"
  care          TEXT NOT NULL DEFAULT '',
  image_url     TEXT NOT NULL DEFAULT '',
  detail_url    TEXT NOT NULL DEFAULT '',
  archived      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE items ADD COLUMN IF NOT EXISTS size TEXT NOT NULL DEFAULT '';
ALTER TABLE items ADD COLUMN IF NOT EXISTS hold_ref TEXT;

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
  status          TEXT NOT NULL DEFAULT 'pending', -- see REQUEST_STATUSES
  close_reason    TEXT NOT NULL DEFAULT '',        -- why it was cancelled / unfulfilled
  close_note      TEXT NOT NULL DEFAULT '',
  confirmed_at    TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE requests ADD COLUMN IF NOT EXISTS close_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS close_note TEXT NOT NULL DEFAULT '';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- One row per handover. Opened when a garment is handed over, closed when it
-- comes back, never reused.
CREATE TABLE IF NOT EXISTS lendings (
  id             SERIAL PRIMARY KEY,
  request_ref    TEXT UNIQUE,
  item_id        TEXT NOT NULL,
  item_name      TEXT NOT NULL DEFAULT '',
  item_size      TEXT NOT NULL DEFAULT '',
  borrower_name  TEXT NOT NULL DEFAULT '',
  lent_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date       DATE,
  due_time       TEXT NOT NULL DEFAULT '',
  returned_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- Website copy edited in Admin → Content. Only wording that differs from the
-- original in lib/content.ts is stored; key is "<page>.<field>".
CREATE TABLE IF NOT EXISTS content (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS items_category_idx ON items (category);
CREATE INDEX IF NOT EXISTS items_status_idx   ON items (status);
CREATE INDEX IF NOT EXISTS requests_created_idx ON requests (created_at DESC);
CREATE INDEX IF NOT EXISTS requests_item_idx  ON requests (item_id);
CREATE INDEX IF NOT EXISTS lendings_item_idx  ON lendings (item_id);
CREATE INDEX IF NOT EXISTS lendings_lent_idx  ON lendings (lent_at DESC);
