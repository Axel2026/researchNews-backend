import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { requireUser, type AuthEnv } from './auth/user';
import { parseLocale } from './articles/locale';
import {
  getArticleBySlug,
  getArticleImage,
  getCategoryBySlug,
  listArticles,
  listCategories,
  recordArticleView,
} from './articles/repository';
import { parseArticleQuery, parseArticleSort } from './articles/search';
import { listBookmarks, setBookmark } from './bookmarks/repository';
import { createCommentSchema, updateCommentSchema } from './comments/body';
import { displayNameFromEmail } from './comments/display-name';
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from './comments/repository';
import { listSources } from './sources/repository';
import { pingSupabase } from './supabase/client';

const bookmarkUpdateSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  bookmarked: z.boolean(),
});

export const app = new Hono();

app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.get('/health', async (c) => {
  return c.json({ ok: true, supabase: await pingSupabase() });
});

app.get('/articles', async (c) => {
  const parsed = parseLocale(c.req.query('locale'));
  if (!parsed.ok) {
    return c.json({ error: 'invalid_locale' }, 400);
  }

  const query = parseArticleQuery(c.req.query('q'));
  const sort = parseArticleSort(c.req.query('sort'));
  if (!query.ok || !sort.ok) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  return c.json(
    await listArticles(parsed.locale, {
      query: query.query,
      sort: sort.sort,
    }),
  );
});

app.get('/sources', async (c) => {
  const parsed = parseLocale(c.req.query('locale'));
  if (!parsed.ok) {
    return c.json({ error: 'invalid_locale' }, 400);
  }

  return c.json(await listSources(parsed.locale));
});

app.get('/categories', async (c) => {
  const parsed = parseLocale(c.req.query('locale'));
  if (!parsed.ok) {
    return c.json({ error: 'invalid_locale' }, 400);
  }

  return c.json(await listCategories(parsed.locale));
});

app.get('/categories/:slug', async (c) => {
  const parsed = parseLocale(c.req.query('locale'));
  if (!parsed.ok) {
    return c.json({ error: 'invalid_locale' }, 400);
  }

  const category = await getCategoryBySlug(c.req.param('slug'), parsed.locale);
  if (!category) {
    return c.json({ error: 'not_found' }, 404);
  }

  return c.json(category);
});

app.get('/articles/:slug/image', async (c) => {
  const image = await getArticleImage(c.req.param('slug'));
  if (!image) {
    return c.json({ error: 'not_found' }, 404);
  }

  return new Response(image.bytes, {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

app.post('/articles/:slug/view', async (c) => {
  const result = await recordArticleView(c.req.param('slug'));
  if (result === 'not_found') {
    return c.json({ error: 'not_found' }, 404);
  }

  return c.body(null, 204);
});

app.get('/articles/:slug/comments', async (c) => {
  const result = await listComments(c.req.param('slug'));
  if (result === 'not_found') {
    return c.json({ error: 'not_found' }, 404);
  }

  return c.json(result);
});

app.get('/articles/:slug', async (c) => {
  const parsed = parseLocale(c.req.query('locale'));
  if (!parsed.ok) {
    return c.json({ error: 'invalid_locale' }, 400);
  }

  const article = await getArticleBySlug(c.req.param('slug'), parsed.locale);
  if (!article) {
    return c.json({ error: 'not_found' }, 404);
  }

  return c.json(article);
});

const me = new Hono<AuthEnv>();
me.use('*', requireUser);

me.get('/bookmarks', async (c) => {
  const parsed = parseLocale(c.req.query('locale'));
  if (!parsed.ok) {
    return c.json({ error: 'invalid_locale' }, 400);
  }

  return c.json(await listBookmarks(c.get('userId'), parsed.locale));
});

me.put('/bookmarks', async (c) => {
  const parsed = bookmarkUpdateSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) {
    return c.json({ error: 'invalid_body' }, 400);
  }

  const result = await setBookmark(
    c.get('userId'),
    parsed.data.slug,
    parsed.data.bookmarked,
  );

  if (result === 'not_found') {
    return c.json({ error: 'not_found' }, 404);
  }

  return c.json(result);
});

app.route('/me', me);

const write = new Hono<AuthEnv>();

write.post('/articles/:slug/comments', requireUser, async (c) => {
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

  if (result === 'not_found') {
    return c.json({ error: 'not_found' }, 404);
  }

  if (result === 'invalid_parent') {
    return c.json({ error: 'invalid_parent' }, 400);
  }

  if (result === 'rate_limited') {
    return c.json({ error: 'rate_limited' }, 429);
  }

  return c.json(result, 201);
});

write.patch('/comments/:id', requireUser, async (c) => {
  const parsed = updateCommentSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) {
    return c.json({ error: 'invalid_body' }, 400);
  }

  const result = await updateComment({
    id: c.req.param('id'),
    userId: c.get('userId'),
    body: parsed.data.body,
  });

  if (result === 'not_found') {
    return c.json({ error: 'not_found' }, 404);
  }

  if (result === 'forbidden') {
    return c.json({ error: 'forbidden' }, 403);
  }

  if (result === 'edit_expired') {
    return c.json({ error: 'edit_expired' }, 403);
  }

  return c.json(result);
});

write.delete('/comments/:id', requireUser, async (c) => {
  const result = await deleteComment({
    id: c.req.param('id'),
    userId: c.get('userId'),
  });

  if (result === 'not_found') {
    return c.json({ error: 'not_found' }, 404);
  }

  if (result === 'forbidden') {
    return c.json({ error: 'forbidden' }, 403);
  }

  return c.json(result);
});

app.route('/', write);
