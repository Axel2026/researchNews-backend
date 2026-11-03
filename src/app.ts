import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { parseLocale } from './articles/locale';
import {
  getArticleBySlug,
  getCategoryBySlug,
  listArticles,
  listCategories,
} from './articles/repository';
import { pingSupabase } from './supabase/client';

export const app = new Hono();

app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
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
