-- ============================================================================
-- Production database schema (PostgreSQL 14+)
-- ============================================================================
-- Mirrors the schema currently running on the managed backend so that you can
-- recreate the database on your own server.
--
-- Usage on a fresh Postgres database:
--     createdb voyages
--     psql -d voyages -f schema.sql
--
-- This file intentionally does NOT include database-specific RLS policies or
-- the auth.users table. When self-hosting, your Node.js API layer is expected
-- to enforce authorization in application code instead of via RLS.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('awaiting_payment', 'confirmed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE voyage_kind AS ENUM ('excursion', 'organise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- Helper: generic updated_at trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Users (placeholder — replace with your own auth strategy)
-- ----------------------------------------------------------------------------
-- When self-hosting you will likely manage users in your Node.js API. This
-- table is included so foreign-key style joins still work; adjust as needed.
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT,                       -- store a hash, never plaintext
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- user_roles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        app_role NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- ----------------------------------------------------------------------------
-- voyages
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voyages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  kind            voyage_kind NOT NULL DEFAULT 'excursion',

  region_fr       TEXT NOT NULL DEFAULT '',
  region_ar       TEXT NOT NULL DEFAULT '',
  region_en       TEXT NOT NULL DEFAULT '',

  name_fr         TEXT NOT NULL,
  name_ar         TEXT NOT NULL DEFAULT '',
  name_en         TEXT NOT NULL DEFAULT '',

  tagline_fr      TEXT NOT NULL DEFAULT '',
  tagline_ar      TEXT NOT NULL DEFAULT '',
  tagline_en      TEXT NOT NULL DEFAULT '',

  description_fr  TEXT NOT NULL DEFAULT '',
  description_ar  TEXT NOT NULL DEFAULT '',
  description_en  TEXT NOT NULL DEFAULT '',

  country_fr      TEXT NOT NULL DEFAULT '',
  country_ar      TEXT NOT NULL DEFAULT '',
  wilaya          TEXT NOT NULL DEFAULT '',
  daira           TEXT NOT NULL DEFAULT '',
  commune         TEXT NOT NULL DEFAULT '',

  image_url       TEXT NOT NULL DEFAULT '',
  days            INTEGER NOT NULL DEFAULT 1,
  price_dzd       INTEGER NOT NULL DEFAULT 0,

  itinerary       JSONB NOT NULL DEFAULT '[]'::jsonb,
  included        JSONB NOT NULL DEFAULT '[]'::jsonb,

  published       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voyages_published ON voyages(published);
CREATE INDEX IF NOT EXISTS idx_voyages_sort ON voyages(sort_order);

DROP TRIGGER IF EXISTS trg_voyages_updated_at ON voyages;
CREATE TRIGGER trg_voyages_updated_at
  BEFORE UPDATE ON voyages
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ----------------------------------------------------------------------------
-- bookings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code     TEXT UNIQUE NOT NULL,

  voyage_slug       TEXT NOT NULL,
  voyage_name       TEXT NOT NULL,

  full_name         TEXT NOT NULL,
  phone_primary     TEXT NOT NULL,
  phone_secondary   TEXT,
  travelers         INTEGER NOT NULL DEFAULT 1,

  wilaya            TEXT NOT NULL,
  daira             TEXT NOT NULL,
  baladya           TEXT NOT NULL,
  pickup_point      TEXT NOT NULL,

  voice_note_url    TEXT,
  receipt_url       TEXT,

  total_dzd         INTEGER NOT NULL,
  status            booking_status NOT NULL DEFAULT 'awaiting_payment',
  notes             TEXT,

  checked_in_at     TIMESTAMPTZ,
  checked_in_by     UUID,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_tracking ON bookings(tracking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ----------------------------------------------------------------------------
-- blacklisted_phones
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blacklisted_phones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL UNIQUE,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- site_settings (key/value store for hero image, tracking pixels, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID
);

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ----------------------------------------------------------------------------
-- voyage_photos (extra gallery images per voyage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voyage_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voyage_id   UUID NOT NULL REFERENCES voyages(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  caption     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voyage_photos_voyage ON voyage_photos(voyage_id);
CREATE INDEX IF NOT EXISTS idx_voyage_photos_sort ON voyage_photos(voyage_id, sort_order);

-- ----------------------------------------------------------------------------
-- testimonials
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name       TEXT NOT NULL,
  author_photo_url  TEXT,
  rating            INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  message_fr        TEXT NOT NULL DEFAULT '',
  message_ar        TEXT NOT NULL DEFAULT '',
  message_en        TEXT NOT NULL DEFAULT '',
  voyage_slug       TEXT,
  published         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials(published);
CREATE INDEX IF NOT EXISTS idx_testimonials_sort ON testimonials(sort_order);

DROP TRIGGER IF EXISTS trg_testimonials_updated_at ON testimonials;
CREATE TRIGGER trg_testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ----------------------------------------------------------------------------
-- Helper functions used by the app
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION attach_receipt_to_booking(_tracking_code TEXT, _receipt_url TEXT)
RETURNS BOOLEAN AS $$
DECLARE _updated INT;
BEGIN
  UPDATE bookings SET receipt_url = _receipt_url WHERE tracking_code = _tracking_code;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role
  );
$$ LANGUAGE sql STABLE;
