import type { SourceListItem } from './types';

export function mapSourceRow(row: {
  id: string;
  name: string;
  url: string;
  summary: string | null;
  fallbackSummary: string;
}): SourceListItem {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    summary: row.summary ?? row.fallbackSummary,
  };
}
