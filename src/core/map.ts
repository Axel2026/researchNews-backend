import { isFieldOfStudy } from '../articles/category';

const PLACEHOLDER_IMAGE = '/images/news-placeholder.svg';
const MIN_ABSTRACT_LENGTH = 180;
const MIN_TITLE_LENGTH = 8;
const MIN_YEAR = 1990;
const MAX_YEAR = new Date().getUTCFullYear() + 1;
const SKIP_DOCUMENT_TYPES = new Set([
  'dataset',
  'book',
  'book part',
  'thesis',
  'report',
  'presentation',
]);

export type PaperPublication = {
  paperPublishedAt: Date;
  year: number | null;
};

export type MappedWork = {
  id: string;
  slug: string;
  authors: string[];
  realTitle: string;
  title: string;
  field: string;
  shortPopularization: string;
  mediumPopularization: string;
  fullPopularization: string;
  doi: string | null;
  year: number | null;
  journal: string | null;
  sourceUrl: string | null;
  downloadUrl: string | null;
  imageUrl: string;
  publishedAt: Date;
  paperPublishedAt: Date | null;
};

type CoreLink = {
  type?: unknown;
  url?: unknown;
};

type CoreJournal = {
  title?: unknown;
};

type CoreWork = {
  id?: unknown;
  title?: unknown;
  abstract?: unknown;
  authors?: unknown;
  doi?: unknown;
  yearPublished?: unknown;
  publishedDate?: unknown;
  depositedDate?: unknown;
  createdDate?: unknown;
  publisher?: unknown;
  journals?: unknown;
  fieldOfStudy?: unknown;
  documentType?: unknown;
  links?: unknown;
  downloadUrl?: unknown;
};

export function mapWork(raw: unknown): MappedWork | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const work = raw as CoreWork;
  const coreId = workId(work.id);
  const realTitle = cleanText(work.title);
  const abstract = cleanText(work.abstract);
  const authors = authorNames(work.authors);
  const documentType = cleanText(work.documentType)?.toLowerCase();
  const fieldOfStudy = fieldOfStudyName(work.fieldOfStudy);

  if (!coreId || !realTitle || realTitle.length < MIN_TITLE_LENGTH) {
    return null;
  }

  if (authors.length === 0) {
    return null;
  }

  if (!abstract || abstract.length < MIN_ABSTRACT_LENGTH) {
    return null;
  }

  if (documentType && SKIP_DOCUMENT_TYPES.has(documentType)) {
    return null;
  }

  if (fieldOfStudy && SKIP_DOCUMENT_TYPES.has(fieldOfStudy.toLowerCase())) {
    return null;
  }

  const publication = paperPublicationFromWork(work);
  const paperPublishedAt = publication?.paperPublishedAt ?? null;
  const year = publication?.year ?? null;
  const publishedAt =
    paperPublishedAt ??
    parseDate(work.depositedDate) ??
    parseDate(work.createdDate);

  if (!publishedAt) {
    return null;
  }

  const doi = normalizeDoi(work.doi);
  const journal = journalName(work);

  return {
    id: `core-${coreId}`,
    slug: `${slugify(realTitle)}-${coreId}`,
    authors,
    realTitle,
    title: realTitle,
    field: fieldName(fieldOfStudy),
    shortPopularization: shortenAbstract(abstract),
    mediumPopularization: abstract,
    fullPopularization: abstract,
    doi,
    year,
    journal,
    sourceUrl: originalPaperUrl(doi, work.links, coreId),
    downloadUrl: paperDownloadUrl(work),
    imageUrl:
      linkUrl(work.links, 'thumbnail_l') ??
      linkUrl(work.links, 'thumbnail_m') ??
      PLACEHOLDER_IMAGE,
    publishedAt,
    paperPublishedAt,
  };
}

export function paperPublicationFromWork(
  raw: unknown,
): PaperPublication | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const work = raw as CoreWork;
  const year =
    parseYear(work.yearPublished) ?? yearFromDate(work.publishedDate);
  const paperPublishedAt =
    parseDate(work.publishedDate) ??
    (year ? new Date(Date.UTC(year, 0, 1)) : null);

  if (!paperPublishedAt) {
    return null;
  }

  return { paperPublishedAt, year };
}

export function parseYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const truncated = Math.trunc(value);
    if (isUsableYear(truncated)) {
      return truncated;
    }

    const digits = String(truncated);
    if (digits.length === 8) {
      const year = Number(digits.slice(0, 4));
      if (isUsableYear(year)) {
        return year;
      }
    }
  }

  if (typeof value === 'string') {
    const match = value.trim().match(/^(19|20)\d{2}/);
    if (match) {
      const year = Number(match[0]);
      if (isUsableYear(year)) {
        return year;
      }
    }
  }

  return null;
}

export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    .replace(/-+$/g, '');

  return slug || 'work';
}

function workId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return null;
}

function authorNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const names: string[] = [];
  for (const author of value) {
    if (typeof author === 'string' && author.trim()) {
      names.push(author.trim());
      continue;
    }

    if (author && typeof author === 'object' && 'name' in author) {
      const name = (author as { name: unknown }).name;
      if (typeof name === 'string' && name.trim()) {
        names.push(name.trim());
      }
    }
  }

  return names;
}

const DOI_JOURNALS: [RegExp, string][] = [
  [/^10\.1038\/s41586/i, 'Nature'],
  [/^10\.1038\/s41591/i, 'Nature Medicine'],
  [/^10\.1038\/s41597/i, 'Scientific Data'],
  [/^10\.1038\/s41598/i, 'Scientific Reports'],
  [/^10\.1038\/s41467/i, 'Nature Communications'],
  [/^10\.1038\/s41567/i, 'Nature Physics'],
  [/^10\.1038\/s41564/i, 'Nature Microbiology'],
  [/^10\.1038\/s41584/i, 'Nature Reviews Rheumatology'],
  [/^10\.1038\/s41893/i, 'Nature Sustainability'],
  [/^10\.1038\/s42003/i, 'Communications Biology'],
  [/^10\.1038\/s42005/i, 'Communications Physics'],
  [/^10\.1038\/s41431/i, 'European Journal of Human Genetics'],
  [/^10\.1038\/s43247/i, 'Communications Earth & Environment'],
  [/^10\.1038\/s43017/i, 'Nature Reviews Earth & Environment'],
  [/^10\.1038\/s44161/i, 'Nature Cardiovascular Research'],
  [/^10\.1038\/s44183/i, 'npj Ocean Sustainability'],
  [/^10\.1073\//i, 'Proceedings of the National Academy of Sciences'],
  [/^10\.1126\/science/i, 'Science'],
  [/^10\.1016\/s0140-6736/i, 'The Lancet'],
];

function journalFromDoi(doi: string | null): string | null {
  if (!doi) {
    return null;
  }

  for (const [pattern, journal] of DOI_JOURNALS) {
    if (pattern.test(doi)) {
      return journal;
    }
  }

  return null;
}

function journalName(work: CoreWork): string | null {
  if (Array.isArray(work.journals)) {
    for (const journal of work.journals as CoreJournal[]) {
      const title = cleanText(journal?.title);
      if (title && title.toLowerCase() !== 'nature') {
        return title;
      }
    }
  }

  const fromDoi = journalFromDoi(normalizeDoi(work.doi));
  if (fromDoi) {
    return fromDoi;
  }

  if (typeof work.publisher === 'string') {
    return cleanText(work.publisher);
  }

  if (
    work.publisher &&
    typeof work.publisher === 'object' &&
    'name' in work.publisher
  ) {
    return cleanText((work.publisher as { name: unknown }).name);
  }

  return null;
}

function fieldOfStudyName(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = cleanText(
        item && typeof item === 'object' && 'name' in item
          ? (item as { name: unknown }).name
          : item,
      );
      if (text) {
        return text;
      }
    }

    return null;
  }

  return cleanText(value);
}

function fieldName(fieldOfStudy: string | null): string {
  if (fieldOfStudy && isFieldOfStudy(fieldOfStudy)) {
    return fieldOfStudy;
  }

  return 'Research';
}

export function originalPaperUrl(
  doi: string | null,
  links: unknown,
  coreId: string,
): string {
  if (doi) {
    return `https://doi.org/${doi}`;
  }

  return linkUrl(links, 'display') ?? `https://core.ac.uk/works/${coreId}`;
}

export function resolveSourceUrl(
  doi: string | null,
  stored: string | null,
): string | null {
  if (doi) {
    return `https://doi.org/${doi}`;
  }

  return stored;
}

export function paperDownloadUrl(work: {
  downloadUrl?: unknown;
  links?: unknown;
}): string | null {
  return httpsUrl(work.downloadUrl) ?? linkUrl(work.links, 'download');
}

function linkUrl(value: unknown, type: string): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const link of value as CoreLink[]) {
    if (link?.type === type) {
      const url = httpsUrl(link.url);
      if (url) {
        return url;
      }
    }
  }

  return null;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const url = value.trim();
  return url.startsWith('https://') ? url : null;
}

export function normalizeDoi(value: unknown): string | null {
  const raw = cleanText(value);
  if (!raw) {
    return null;
  }

  return raw.replace(/^https?:\/\/doi\.org\//i, '').replace(/\.$/, '') || null;
}

function shortenAbstract(abstract: string): string {
  const sentences = abstract.split(/(?<=[.!?])\s+/).filter(Boolean);
  const short = sentences.slice(0, 2).join(' ');
  if (short && short.length <= 420) {
    return short;
  }

  if (abstract.length <= 420) {
    return abstract;
  }

  return `${abstract.slice(0, 417).trimEnd()}...`;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (!isUsableYear(date.getUTCFullYear())) {
    return null;
  }

  return date;
}

function yearFromDate(value: unknown): number | null {
  const date = parseDate(value);
  return date ? date.getUTCFullYear() : null;
}

function isUsableYear(year: number): boolean {
  return year >= MIN_YEAR && year <= MAX_YEAR;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.replace(/\s+/g, ' ').trim();
  return text || null;
}
