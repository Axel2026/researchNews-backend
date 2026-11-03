# Badania — backend

Read API for popular-science articles. This is a separate HTTP process; the frontend does not live here.

## Requirements

- Node.js 26
- pnpm 12.16.1
- Docker (Postgres 16). If `docker` is not on PATH, start Docker Desktop or add `Docker\resources\bin` to PATH, then `docker compose up -d`.

## Setup

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm ingest:core
pnpm dev
```

Put `CORE_API_KEY` and the Supabase keys in `.env` (gitignored). CORE's `citationCount` is deprecated and cannot be used to sort, so ingest pulls recent works from Nature, Science, Cell, Lancet, and PNAS, then falls back to DOI-bearing 2024 records. Abstracts are stored as popularization text until a later rewrite step.

## Supabase

The API process uses a server `supabase-js` client (`SUPABASE_SECRET_KEY`, never ship this to the browser). `GET /health` reports `{ "ok": true, "supabase": true }` when the Data API answers.

Articles still go through Drizzle. Local Docker Postgres is the default `DATABASE_URL`. To store them in this Supabase project, replace `DATABASE_URL` with the **Shared pooler** URI from Dashboard → Connect (database password, not the API secret), then:

```bash
pnpm db:migrate
pnpm db:seed
pnpm ingest:core
```

API: [http://localhost:4000](http://localhost:4000)

## Scripts

| Command            | Description                                                                      |
| ------------------ | -------------------------------------------------------------------------------- |
| `pnpm dev`         | Dev server (port 4000)                                                           |
| `pnpm test`        | Vitest (locale, sort, seed validation, CORE mapping)                             |
| `pnpm typecheck`   | TypeScript check without emitting files                                          |
| `pnpm db:migrate`  | Drizzle migrations                                                               |
| `pnpm db:seed`     | Upsert 3 records from `frontend/src/data/prace-badawcze.json`                    |
| `pnpm ingest:core` | Fetch 20 CORE works (Nature/Science/Cell/Lancet/PNAS, 2022–2024) and upsert them |

## Contract

- `GET /health`
- `GET /articles?locale=pl` — home list: featured first, then `publishedAt` descending
- `GET /articles/:slug?locale=pl` — full record; 404 if missing
- `GET /categories?locale=pl` — unique CORE `fieldOfStudy` values as `{ slug, field }`, alphabetically; journals and document types are omitted
- `GET /categories/:slug?locale=pl` — `{ slug, field, articles }` for one field; 404 if nothing matches

`locale` is optional and defaults to `pl`. Allowed: `en`, `pl`, `de`, `fr`, `es`. Missing translation → Polish content. Missing Polish translation → omitted from the list / 404.

## Smoke

```bash
curl -s http://localhost:4000/health
# {"ok":true,"supabase":true}
curl -s "http://localhost:4000/articles?locale=pl"
curl -s "http://localhost:4000/categories?locale=pl"
curl -s "http://localhost:4000/categories/biochemia-i-mikrobiologia?locale=pl"
curl -s "http://localhost:4000/articles/bombininy-h-niezwykle-peptydy-ze-skory-kumaka?locale=pl"
curl -s "http://localhost:4000/articles/bombininy-h-niezwykle-peptydy-ze-skory-kumaka?locale=de"
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/articles/brak-takiego-sluga
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/categories/brak-takiej-kategorii
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/articles?locale=it"
```

`locale=de` with no German translation returns Polish text. Unknown article or category slug → 404 `{ "error": "not_found" }`. `locale=it` → 400 `{ "error": "invalid_locale" }`.
