# Backend conventions

Apply these when adding or editing backend code.

## Language

Code, identifiers, comments, and commit messages are English.

## Modules

- One concern per file. Put its test beside it as `*.test.ts`. Do not add `index.ts` barrels.
- Named exports. Prefer `type` over `interface`. No `any`. No default export. `drizzle.config.ts` and `vitest.config.ts` keep the default export their tools require.

## Handlers

Routes in `src/app.ts` stay thin. Parse at the HTTP boundary, then call a repository or a pure function. Do not put SQL or business rules in the handler.

Query and path values use a parser that returns `{ ok: true, ... } | { ok: false }` (`parseLocale` in `src/articles/locale.ts`). JSON bodies use a Zod schema and `safeParse`.

```ts
const parsed = createCommentSchema.safeParse(
  await c.req.json().catch(() => null),
);
if (!parsed.success) {
  return c.json({ error: 'invalid_body' }, 400);
}

const result = await createComment({
  slug: c.req.param('slug'),
  userId: c.get('userId'),
  displayName: displayNameFromEmail(c.get('email')),
  body: parsed.data.body,
  parentId: parsed.data.parentId,
});
```

## Domain logic

Rules with no I/O live in a small module next to the feature (`src/comments/edit-window.ts`, `src/articles/locale.ts`, `src/articles/search.ts`). SQL stays in `repository.ts` and goes through Drizzle.

## Errors

Failed requests return `{ error: 'snake_case' }` and the HTTP status. Reuse the existing codes: `invalid_locale`, `invalid_query`, `invalid_body`, `invalid_parent`, `not_found`, `unauthorized`, `forbidden`, `edit_expired`, `rate_limited`. The body stays a code. No exception text, stack, or driver error.

Do not swallow a failure. No empty `catch`. When you wrap an error, keep the cause:

```ts
throw new Error('Failed to upsert article', { cause: error });
```

## Database

Change the table in `src/db/schema.ts`, generate a migration with `pnpm db:generate`, and apply it with `pnpm db:migrate`. Leave a migration that has already been applied untouched. Do not hand-write SQL under `drizzle/` to sneak in a schema change.

## Comments

A comment records why: a constraint, an invariant, or a decision the code cannot show. It does not restate what the next line does.

## Seeding new articles from the CORE API

`mapWork` and `pnpm ingest:core` only store a placeholder. `title` is the paper title. `shortPopularization` is the first two sentences of the abstract. `mediumPopularization` and `fullPopularization` are the abstract copied as-is, written the same way for `en` and `pl`. That row is not a finished article.

New CORE works go in through `PopularizedArticle` (`src/ingest/upsert-papers.ts`): write `tmp/*-popularized.json`, then upsert (`pnpm ingest:extra` reads `tmp/extra-popularized.json`). Copy bibliographic fields from the CORE record. Generate the popularization; do not leave the abstract in those columns.

### Copy from CORE

- `id` (`core-{coreId}`), `authors`, `realTitle`
- `doi`, `year`, `journal`, `sourceUrl`, `downloadUrl`
- `publishedAt`, `paperPublishedAt`

The CORE thumbnail is not the article image. Without a stored file the API shows `/images/news-placeholder.svg`.

### Generate before upsert

`slug` — unique kebab-case slug. The hand-written seeds in `frontend/src/data/prace-badawcze.json` slug the Polish headline. Bookmarks and `frontend/public/images/articles/{slug}.*` key off it, so do not change it after insert.

Both `pl` and `en` need their own translation. None of these fields is the abstract or `realTitle`:

- `title` — popular-science headline.
- `field` — discipline name in that language. It must pass `isFieldOfStudy` in `src/articles/category.ts` (not a journal, document type, publisher, or the `"Research"` fallback). `fieldSlug` is derived from the Polish `field`.
- `shortPopularization` — lead of a few sentences. Shown on cards and as the article dek. State the finding and a limit of what the paper does not show.
- `mediumPopularization` — shorter popular summary.
- `fullPopularization` — full popular article. Explain terms in plain language. Do not claim results the paper did not measure.

Separate paragraphs in `mediumPopularization` and `fullPopularization` with a blank line (`\n\n`). The site splits on that.

Match the tone of `frontend/src/data/prace-badawcze.json`.

### Generate the image

One editorial photograph per article: 16:9 landscape, no text, no logos, no watermarks, photorealistic, about the subject of that paper. Cards crop it to 16:10.

Save it as `frontend/public/images/articles/{slug}.jpg` (`.jpeg`, `.png`, and `.webp` also work). The filename without the extension is the article slug. Then run `pnpm ingest:images`. That writes the bytes to `articles.image` and `image_content_type`. The API serves them at `GET /articles/{slug}/image`. A file left only on disk still shows the placeholder.
