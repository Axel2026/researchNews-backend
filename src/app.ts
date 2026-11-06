import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requireUser, type AuthEnv } from './auth/user';
import { getArticleImage } from './articles/images/repository';
import { parseLocale } from './articles/locale';
import {
  getArticleBySlug,
  listArticlePage,
  listArticles,
} from './articles/repository';
import {
  articleDateBounds,
  parseArticleDate,
  parseArticleField,
  parseArticlePage,
  parseArticleQuery,
  parseArticleSort,
} from './articles/search';
import { parseSlug } from './articles/slug';
import { bookmarkUpdateSchema } from './bookmarks/body';
import { listBookmarks, setBookmark } from './bookmarks/repository';
import { getCategoryBySlug, listCategories } from './categories/repository';
import { parseCommentId } from './comments/id';
import { recordArticleView } from './views/repository';
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
  const author = parseArticleQuery(c.req.query('author'));
  const field = parseArticleField(c.req.query('field'));
  const sort = parseArticleSort(c.req.query('sort'));
  const from = parseArticleDate(c.req.query('from'));
  const to = parseArticleDate(c.req.query('to'));
  const page = parseArticlePage(c.req.query('page'));
  if (
    !query.ok ||
    !author.ok ||
    !field.ok ||
    !sort.ok ||
    !from.ok ||
    !to.ok ||
    !page.ok
  ) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  const bounds = articleDateBounds(from.date, to.date);
  if (!bounds.ok) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  const options = {
    query: query.query,
    author: author.query,
    field: field.field,
    sort: sort.sort,
    start: bounds.start,
    endExclusive: bounds.endExclusive,
  };

  if (page.page === undefined) {
    return c.json(await listArticles(parsed.locale, options));
  }

  return c.json(
    await listArticlePage(parsed.locale, { ...options, page: page.page }),
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

  const page = parseArticlePage(c.req.query('page'));
  const slug = parseSlug(c.req.param('slug'));
  if (!page.ok || !slug.ok) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  const category = await getCategoryBySlug(
    slug.slug,
    parsed.locale,
    page.page ?? 1,
  );
  if (!category) {
    return c.json({ error: 'not_found' }, 404);
  }

  return c.json(category);
});

app.get('/articles/:slug/image', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  if (!slug.ok) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  const image = await getArticleImage(slug.slug);
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
  const slug = parseSlug(c.req.param('slug'));
  if (!slug.ok) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  const result = await recordArticleView(slug.slug);
  if (result === 'not_found') {
    return c.json({ error: 'not_found' }, 404);
  }

  return c.body(null, 204);
});

app.get('/articles/:slug/comments', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  if (!slug.ok) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  const result = await listComments(slug.slug);
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

  const slug = parseSlug(c.req.param('slug'));
  if (!slug.ok) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  const article = await getArticleBySlug(slug.slug, parsed.locale);
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

  const slug = parseSlug(c.req.param('slug'));
  if (!slug.ok) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  const result = await createComment({
    slug: slug.slug,
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

  const id = parseCommentId(c.req.param('id'));
  if (!id.ok) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  const result = await updateComment({
    id: id.id,
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
  const id = parseCommentId(c.req.param('id'));
  if (!id.ok) {
    return c.json({ error: 'invalid_query' }, 400);
  }

  const result = await deleteComment({
    id: id.id,
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
