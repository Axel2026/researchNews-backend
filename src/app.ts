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
} from './articles/repository';
import { listBookmarks, setBookmark } from './bookmarks/repository';
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
    allowMethods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
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

  return c.json(await listArticles(parsed.locale));
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
