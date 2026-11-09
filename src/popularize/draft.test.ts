import { describe, expect, it } from 'vitest';
import { parsePopularization } from './draft';

const abstract =
  'The study measured enzyme resistance of two peptide variants in a laboratory assay and did not test animals.';

const realTitle = 'Antibacterial peptides from Bombina variegata';

function fields(title: string) {
  return {
    title,
    field: 'Microbiology',
    shortPopularization:
      'A lab assay found one peptide variant resisted an enzyme longer. The study did not test this in animals.',
    mediumPopularization:
      'Researchers compared two short peptides taken from the skin of a frog and watched what an enzyme did to each one.\n\nOne variant lasted longer when the enzyme tried to break it down. The experiment stayed in the lab and did not follow an animal or a patient.',
    fullPopularization: `${'The paper looks at short peptides taken from frog skin and compares how long each one survives an enzyme in a dish. '.repeat(4)}\n\nIn the assay, the unusual amino acid made one variant harder for the enzyme to cut. The authors describe the difference as a laboratory result.\n\nThey did not measure infection, treatment, or anything outside that assay, so the article should not turn the finding into a medicine.`,
  };
}

describe('parsePopularization', () => {
  it('accepts both locales when they follow the editorial rules', () => {
    const draft = parsePopularization(
      {
        pl: fields('Peptyd ze skóry kumaka'),
        en: fields('A frog peptide lasts longer'),
      },
      abstract,
      realTitle,
    );

    expect(draft?.pl.title).toBe('Peptyd ze skóry kumaka');
    expect(draft?.en.field).toBe('Microbiology');
  });

  it('rejects the abstract, the paper title, a journal name, and a missing break', () => {
    expect(
      parsePopularization(
        {
          pl: { ...fields('Tytuł'), shortPopularization: abstract },
          en: fields('Headline'),
        },
        abstract,
        realTitle,
      ),
    ).toBeNull();

    expect(
      parsePopularization(
        {
          pl: { ...fields(realTitle) },
          en: fields('Headline'),
        },
        abstract,
        realTitle,
      ),
    ).toBeNull();

    expect(
      parsePopularization(
        {
          pl: { ...fields('Tytuł'), field: 'Nature' },
          en: fields('Headline'),
        },
        abstract,
        realTitle,
      ),
    ).toBeNull();

    expect(
      parsePopularization(
        {
          pl: {
            ...fields('Tytuł'),
            fullPopularization: 'x'.repeat(500),
          },
          en: fields('Headline'),
        },
        abstract,
        realTitle,
      ),
    ).toBeNull();
  });
});
