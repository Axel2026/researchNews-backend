export type ArticleListItem = {
  id: string;
  slug: string;
  title: string;
  field: string;
  fieldSlug: string;
  shortPopularization: string;
  imageUrl: string;
  publishedAt: string;
  paperPublishedAt: string | null;
  featured: boolean;
};

export type ArticleDetail = ArticleListItem & {
  authors: string[];
  realTitle: string;
  mediumPopularization: string;
  fullPopularization: string;
  doi: string | null;
  year: number | null;
  journal: string | null;
  sourceUrl: string | null;
  downloadUrl: string | null;
};

export type ArticleCategory = {
  slug: string;
  field: string;
};

export type ArticleCategoryDetail = ArticleCategory & {
  articles: ArticleListItem[];
};
