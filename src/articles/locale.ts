export const LOCALES = ['en', 'pl', 'de', 'fr', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pl';
export const FALLBACK_LOCALE: Locale = 'pl';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function parseLocale(
  raw: string | undefined,
): { ok: true; locale: Locale } | { ok: false } {
  if (raw === undefined || raw === '') {
    return { ok: true, locale: DEFAULT_LOCALE };
  }

  if (!isLocale(raw)) {
    return { ok: false };
  }

  return { ok: true, locale: raw };
}

export function pickTranslation<T extends { locale: string }>(
  translations: T[],
  requested: Locale,
): T | undefined {
  return (
    translations.find((item) => item.locale === requested) ??
    translations.find((item) => item.locale === FALLBACK_LOCALE)
  );
}
