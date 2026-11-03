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
pnpm dev
```

API: [http://localhost:4000](http://localhost:4000)

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server (port 4000) |
| `pnpm test` | Vitest (locale, sort, seed validation) |
| `pnpm typecheck` | TypeScript check without emitting files |
| `pnpm db:migrate` | Drizzle migrations |
| `pnpm db:seed` | Upsert 3 records from `frontend/src/data/prace-badawcze.json` |

## Contract

- `GET /health`
- `GET /articles?locale=pl` — home list: featured first, then `publishedAt` descending
- `GET /articles/:slug?locale=pl` — full record; 404 if missing

`locale` is optional and defaults to `pl`. Allowed: `en`, `pl`, `de`, `fr`, `es`. Missing translation → Polish content. Missing Polish translation → omitted from the list / 404.

## Smoke

```bash
curl -s http://localhost:4000/health
curl -s "http://localhost:4000/articles?locale=pl"
curl -s "http://localhost:4000/articles/bombininy-h-niezwykle-peptydy-ze-skory-kumaka?locale=pl"
curl -s "http://localhost:4000/articles/bombininy-h-niezwykle-peptydy-ze-skory-kumaka?locale=de"
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/articles/brak-takiego-sluga
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/articles?locale=it"
```

`locale=de` with no German translation returns Polish text. Unknown slug → 404 `{ "error": "not_found" }`. `locale=it` → 400 `{ "error": "invalid_locale" }`.
