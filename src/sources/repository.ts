import { and, asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db/client';
import { sources, sourceTranslations } from '../db/schema';
import { FALLBACK_LOCALE, type Locale } from '../articles/locale';
import { mapSourceRow } from './map';
import type { SourceListItem } from './types';

const polish = alias(sourceTranslations, 'pl');
const requested = alias(sourceTranslations, 'requested');

export async function listSources(locale: Locale): Promise<SourceListItem[]> {
  const rows = await db
    .select({
      id: sources.id,
      name: sources.name,
      url: sources.url,
      summary: requested.summary,
      fallbackSummary: polish.summary,
    })
    .from(sources)
    .innerJoin(
      polish,
      and(eq(polish.sourceId, sources.id), eq(polish.locale, FALLBACK_LOCALE)),
    )
    .leftJoin(
      requested,
      and(eq(requested.sourceId, sources.id), eq(requested.locale, locale)),
    )
    .orderBy(asc(sources.position), asc(sources.name));

  return rows.map(mapSourceRow);
}
