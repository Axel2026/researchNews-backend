import { z } from 'zod';
import { AI_PROVIDERS, isProviderModel } from './providers';

const providerSchema = z.enum(AI_PROVIDERS);

export const saveAiKeySchema = z
  .object({
    provider: providerSchema,
    model: z.string().trim().min(1).max(80),
    apiKey: z
      .string()
      .trim()
      .min(20)
      .max(400)
      .refine((value) => !/\s/.test(value))
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!isProviderModel(value.provider, value.model)) {
      context.addIssue({
        code: 'custom',
        path: ['model'],
        message: 'unknown_model',
      });
    }
  });

export const popularizeBodySchema = z
  .object({
    provider: providerSchema,
  })
  .strict();
