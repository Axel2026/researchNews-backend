import { describe, expect, it } from 'vitest';
import { parseLocale, pickTranslation } from './locale';

describe('parseLocale', () => {
  it('defaults to Polish when locale is missing or empty', () => {
    expect(parseLocale(undefined)).toEqual({ ok: true, locale: 'pl' });
    expect(parseLocale('')).toEqual({ ok: true, locale: 'pl' });
  });

  it('accepts supported locales', () => {
    expect(parseLocale('en')).toEqual({ ok: true, locale: 'en' });
    expect(parseLocale('de')).toEqual({ ok: true, locale: 'de' });
  });

  it('rejects unsupported locales', () => {
    expect(parseLocale('it')).toEqual({ ok: false });
    expect(parseLocale('PL')).toEqual({ ok: false });
  });
});

describe('pickTranslation', () => {
  const translations = [
    { locale: 'pl', title: 'Po polsku' },
    { locale: 'en', title: 'In English' },
  ];

  it('returns the requested locale when it exists', () => {
    expect(pickTranslation(translations, 'en')?.title).toBe('In English');
  });

  it('falls back to Polish when the requested locale is missing', () => {
    expect(pickTranslation(translations, 'de')?.title).toBe('Po polsku');
  });

  it('returns undefined when Polish is also missing', () => {
    expect(pickTranslation([{ locale: 'en', title: 'Only EN' }], 'de')).toBe(
      undefined,
    );
  });
});
