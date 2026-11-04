import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);

export const paperSeedSchema = z.object({
  id: nonEmpty,
  slug: nonEmpty.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  authors: z.array(nonEmpty).min(1),
  field: nonEmpty,
  title: nonEmpty,
  realTitle: nonEmpty,
  shortPopularization: nonEmpty,
  mediumPopularization: nonEmpty,
  fullPopularization: nonEmpty,
  year: z.number().int().nullable().optional(),
  paperPublishedAt: z.iso.datetime().nullable().optional(),
});

export type PaperSeed = z.infer<typeof paperSeedSchema>;

export const papersSeedSchema = z
  .array(paperSeedSchema)
  .min(1)
  .superRefine((papers, ctx) => {
    const slugs = new Set<string>();
    const ids = new Set<string>();

    for (const [index, paper] of papers.entries()) {
      if (ids.has(paper.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate id ${paper.id}`,
          path: [index, 'id'],
        });
      }
      ids.add(paper.id);

      if (slugs.has(paper.slug)) {
        ctx.addIssue({
          code: 'custom',
          message: `duplicate slug ${paper.slug}`,
          path: [index, 'slug'],
        });
      }
      slugs.add(paper.slug);
    }
  });
