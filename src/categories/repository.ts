import { listArticlePage, listArticles } from '../articles/repository';
import { uniqueCategories } from '../articles/category';
import type { Locale } from '../articles/locale';
import type { ArticleCategory, ArticleCategoryDetail } from '../articles/types';

export async function listCategories(
  locale: Locale,
): Promise<ArticleCategory[]> {
  return uniqueCategories(await listArticles(locale));
}

export async function getCategoryBySlug(
  slug: string,
  locale: Locale,
  page = 1,
): Promise<ArticleCategoryDetail | undefined> {
  const result = await listArticlePage(locale, {
    field: slug,
    sort: 'newest',
    page,
  });
  const field = result.articles[0]?.field;

  if (!field) {
    return undefined;
  }

  return { slug, field, ...result };
}
