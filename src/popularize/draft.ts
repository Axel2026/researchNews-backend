import { isFieldOfStudy } from '../articles/category';
import type { PopularizationDraft, PopularizationFields } from './prompt';

const SHORT_MIN = 40;
const SHORT_MAX = 700;
const MEDIUM_MIN = 200;
const MEDIUM_MAX = 4000;
const FULL_MIN = 500;
const FULL_MAX = 12000;
const TITLE_MIN = 8;
const TITLE_MAX = 180;

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function readFields(value: unknown): PopularizationFields | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const title = record.title;
  const field = record.field;
  const shortPopularization = record.shortPopularization;
  const mediumPopularization = record.mediumPopularization;
  const fullPopularization = record.fullPopularization;

  if (
    typeof title !== 'string' ||
    typeof field !== 'string' ||
    typeof shortPopularization !== 'string' ||
    typeof mediumPopularization !== 'string' ||
    typeof fullPopularization !== 'string'
  ) {
    return null;
  }

  return {
    title: title.trim(),
    field: field.trim(),
    shortPopularization: shortPopularization.trim(),
    mediumPopularization: mediumPopularization.trim(),
    fullPopularization: fullPopularization.trim(),
  };
}

function fieldOk(
  fields: PopularizationFields,
  abstract: string,
  realTitle: string,
): boolean {
  const source = normalized(abstract);
  const paperTitle = normalized(realTitle);
  const lengths = [
    [fields.shortPopularization, SHORT_MIN, SHORT_MAX],
    [fields.mediumPopularization, MEDIUM_MIN, MEDIUM_MAX],
    [fields.fullPopularization, FULL_MIN, FULL_MAX],
  ] as const;

  if (fields.title.length < TITLE_MIN || fields.title.length > TITLE_MAX) {
    return false;
  }

  if (normalized(fields.title) === paperTitle) {
    return false;
  }

  if (!isFieldOfStudy(fields.field)) {
    return false;
  }

  for (const [text, min, max] of lengths) {
    if (text.length < min || text.length > max) {
      return false;
    }

    if (normalized(text) === source) {
      return false;
    }
  }

  if (!fields.mediumPopularization.includes('\n\n')) {
    return false;
  }

  if (!fields.fullPopularization.includes('\n\n')) {
    return false;
  }

  return true;
}

export function parsePopularization(
  value: unknown,
  abstract: string,
  realTitle: string,
): PopularizationDraft | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const pl = readFields(record.pl);
  const en = readFields(record.en);

  if (!pl || !en) {
    return null;
  }

  if (!fieldOk(pl, abstract, realTitle) || !fieldOk(en, abstract, realTitle)) {
    return null;
  }

  if (normalized(pl.title) === normalized(en.title)) {
    return null;
  }

  return { pl, en };
}
