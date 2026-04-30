# Alfarouk Voyage — Web App

Standard React 18 + Vite 5 + TypeScript + Tailwind CSS application.
Production-ready for self-hosting on any Node-capable server.

---

## 1. Stack

- **Framework**: React 18, Vite 5
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v3 + shadcn/ui design system
- **Data layer**: pluggable adapter (`src/services/api.ts`)
  - Default: Dexie.js (local storage)
  - Optional: custom Node.js + Postgres REST API

---

## 2. Local development

```bash
cp .env.example .env.local
# fill in the values, then:
npm install
npm run dev
```

The app starts on http://localhost:8080 (or the next free port).

---

## 3. Production build

```bash
npm install
npm run build
npm run preview        # optional: smoke-test the production bundle
```

The compiled site lands in `dist/`. Serve it with any static host (nginx,
Caddy, S3 + CloudFront, Vercel, Netlify, your own Node static server, etc.).

---

## 4. Database

A standalone PostgreSQL schema is provided at the repository root: **`schema.sql`**.

```bash
createdb voyages
psql -d voyages -f schema.sql
```

The schema mirrors the production database exactly (tables: `voyages`,
`bookings`, `blacklisted_phones`, `site_settings`, `user_roles`, plus the
`app_role`, `booking_status`, `voyage_kind` enums).

When self-hosting with your own API, your Node backend is responsible for
authorization (the schema does not include database-specific RLS policies, since RLS is
specific to that platform).

---

## 5. Switching to a self-hosted backend

The whole UI talks to a single facade: **`src/services/api.ts`**. There are
two implementations:

| File                              | Active when           |
| --------------------------------- | --------------------- |
| `src/services/impl/local.ts`      | `VITE_API_MODE=local` (default) |
| `src/services/impl/http.ts`       | `VITE_API_MODE=http`  |

To migrate:

1. Stand up a Node.js + Postgres backend that implements the endpoints
   documented in `src/services/impl/http.ts`.
2. Set the following in your `.env`:
   ```
   VITE_API_MODE=http
   VITE_API_BASE_URL=https://api.your-domain.com
   ```
3. Rebuild — no application code changes required.

---

## 6. Environment variables

All configuration is read from `.env` / `.env.local` via `import.meta.env`.
**No cloud-specific URLs or keys are hardcoded anywhere in the source.**

See `.env.example` for the full list.

---

## 7. Project layout (high level)

```
src/
  components/         UI components (shadcn-based)
  components/admin/   Admin dashboard widgets
  pages/              Route components
  services/
    api.ts            Public data-access facade (import this)
    api.types.ts      Shared DTOs
    impl/local.ts     Local Dexie adapter
    impl/http.ts      REST adapter (stub — implement endpoints to enable)
  i18n/               French / Arabic / English translations
  data/               Static voyage helpers
schema.sql            Standalone PostgreSQL schema
```
