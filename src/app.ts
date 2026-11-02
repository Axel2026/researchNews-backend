import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { parseLocale } from './articles/locale';
import { getArticleBySlug, listArticles } from './articles/repository';

export const app = new Hono();

app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  }),
);

app.get('/health', (c) => c.json({ ok: true }));

app.get('/articles', async (c) => {
  const parsed = parseLocale(c.req.query('locale'));
  if (!parsed.ok) {
    return c.json({ error: 'invalid_locale' }, 400);
  }

  return c.json(await listArticles(parsed.locale));
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
