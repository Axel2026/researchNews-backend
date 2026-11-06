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
  recentViews: number;
  authors: string[];
  commentCount: number;
};

export type ArticleDetail = ArticleListItem & {
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

export type ArticlePage = {
  articles: ArticleListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type ArticleCategoryDetail = ArticleCategory & ArticlePage;
