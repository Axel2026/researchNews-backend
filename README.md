# Badania — backend

Odczyt artykułów popularnonaukowych. Frontendu nie przepina — ten serwis jest osobnym procesem HTTP.

## Wymagania

- Node.js 26
- pnpm 12.16.1
- Docker (Postgres 16). Jeśli `docker` nie jest w PATH, uruchom Docker Desktop albo dodaj `Docker\resources\bin` do PATH, potem `docker compose up -d`.

## Uruchomienie

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

API: [http://localhost:4000](http://localhost:4000)

## Polecenia

| Polecenie         | Opis                                                        |
| ----------------- | ----------------------------------------------------------- |
| `pnpm dev`        | Serwer deweloperski (port 4000)                             |
| `pnpm test`       | Testy Vitest (locale, sort, walidacja seedu)                |
| `pnpm typecheck`  | TypeScript bez emitowania plików                            |
| `pnpm db:migrate` | Migracje Drizzle                                            |
| `pnpm db:seed`    | Upsert 3 rekordów z `frontend/src/data/prace-badawcze.json` |

## Kontrakt

- `GET /health`
- `GET /articles?locale=pl` — lista pod home: featured pierwsze, potem `publishedAt` malejąco
- `GET /articles/:slug?locale=pl` — pełny rekord; 404 gdy brak

`locale` opcjonalne, domyślnie `pl`. Dozwolone: `en`, `pl`, `de`, `fr`, `es`. Brak tłumaczenia → treść polska. Brak polskiego tłumaczenia → brak na liście / 404.

## Smoke

```bash
curl -s http://localhost:4000/health
curl -s "http://localhost:4000/articles?locale=pl"
curl -s "http://localhost:4000/articles/bombininy-h-niezwykle-peptydy-ze-skory-kumaka?locale=pl"
curl -s "http://localhost:4000/articles/bombininy-h-niezwykle-peptydy-ze-skory-kumaka?locale=de"
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/articles/brak-takiego-sluga
curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/articles?locale=it"
```

`locale=de` bez tłumaczenia niemieckiego zwraca polski tekst. Nieistniejący slug → 404 `{ "error": "not_found" }`. `locale=it` → 400 `{ "error": "invalid_locale" }`.
