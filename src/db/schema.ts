import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const articles = pgTable(
  'articles',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    authors: text('authors').array().notNull(),
    realTitle: text('real_title').notNull(),
    imageUrl: text('image_url').notNull(),
    image: bytea('image'),
    imageContentType: text('image_content_type'),
    featured: boolean('featured').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    paperPublishedAt: timestamp('paper_published_at', { withTimezone: true }),
    doi: text('doi'),
    year: integer('year'),
    journal: text('journal'),
    sourceUrl: text('source_url'),
    downloadUrl: text('download_url'),
    fieldSlug: text('field_slug').notNull(),
  },
  (table) => [
    check('articles_authors_min', sql`cardinality(${table.authors}) >= 1`),
    index('articles_field_slug_idx').on(table.fieldSlug),
  ],
);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  bookmarkedSlugs: text('bookmarked_slugs')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  displayName: text('display_name'),
});

export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    articleId: text('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('comments_article_created_idx').on(table.articleId, table.createdAt),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'comments_parent_id_comments_id_fk',
    }).onDelete('cascade'),
  ],
);

export const articleViewDays = pgTable(
  'article_view_days',
  {
    articleId: text('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    views: integer('views').notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.articleId, table.day] }),
    index('article_view_days_day_idx').on(table.day),
    check('article_view_days_views_positive', sql`${table.views} >= 1`),
  ],
);

export const articleTranslations = pgTable(
  'article_translations',
  {
    articleId: text('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    title: text('title').notNull(),
    field: text('field').notNull(),
    shortPopularization: text('short_popularization').notNull(),
    mediumPopularization: text('medium_popularization').notNull(),
    fullPopularization: text('full_popularization').notNull(),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.locale] })],
);

export const sources = pgTable('sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  position: integer('position').notNull().default(0),
});

export const sourceTranslations = pgTable(
  'source_translations',
  {
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    summary: text('summary').notNull(),
  },
  (table) => [primaryKey({ columns: [table.sourceId, table.locale] })],
);
