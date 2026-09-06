-- Rabt schema. Runs on Neon Postgres in production and PGlite locally.

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
  sizes         TEXT NOT NULL DEFAULT '',          -- comma separated, e.g. "S,M,L"
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

CREATE TABLE IF NOT EXISTS requests (
  ref             TEXT PRIMARY KEY,
  item_id         TEXT,
  item_name       TEXT NOT NULL DEFAULT '',
  size            TEXT NOT NULL DEFAULT '',
  requested_date  TEXT NOT NULL DEFAULT '',
  requested_time  TEXT NOT NULL DEFAULT '',
  contact_method  TEXT NOT NULL DEFAULT '',
  contact_value   TEXT NOT NULL DEFAULT '',
  person_name     TEXT NOT NULL DEFAULT '',
  contribution    TEXT NOT NULL DEFAULT '',
  status          INT  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE INDEX IF NOT EXISTS items_category_idx ON items (category);
CREATE INDEX IF NOT EXISTS items_status_idx   ON items (status);
CREATE INDEX IF NOT EXISTS requests_created_idx ON requests (created_at DESC);
