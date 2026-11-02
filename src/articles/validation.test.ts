import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { papersSeedSchema } from './validation';

const valid = {
  id: '1',
  slug: 'bombininy-h-niezwykle-peptydy-ze-skory-kumaka',
  authors: ['Giuseppina Mignogna'],
  field: 'Biochemia i mikrobiologia',
  title: 'Niezwykły składnik skóry kumaka pomaga peptydom przetrwać',
  realTitle: 'Antibacterial and haemolytic peptides',
  shortPopularization: 'Krótki tekst.',
  mediumPopularization: 'Średni tekst.',
  fullPopularization: 'Pełny tekst.',
};

describe('papersSeedSchema', () => {
  it('accepts a valid paper list', () => {
    expect(papersSeedSchema.parse([valid])).toHaveLength(1);
  });

  it('rejects an empty title or missing authors', () => {
    expect(() =>
      papersSeedSchema.parse([{ ...valid, title: '   ' }]),
    ).toThrow();
    expect(() => papersSeedSchema.parse([{ ...valid, authors: [] }])).toThrow();
  });

  it('rejects duplicate slugs', () => {
    expect(() =>
      papersSeedSchema.parse([
        valid,
        { ...valid, id: '2', title: 'Inny tytuł' },
      ]),
    ).toThrow(/duplicate slug/);
  });

  it('accepts the frontend seed JSON', () => {
    const file = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../frontend/src/data/prace-badawcze.json',
    );
    const data = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    expect(papersSeedSchema.parse(data)).toHaveLength(3);
  });
});
