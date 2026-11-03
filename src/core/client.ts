const DEFAULT_BASE_URL = 'https://api.core.ac.uk/v3';
const REQUEST_TIMEOUT_MS = 30_000;

export type CoreSearchParams = {
  q: string;
  limit: number;
  offset?: number;
  sort?: string;
};

export type CoreClient = {
  searchWorks: (params: CoreSearchParams) => Promise<unknown[]>;
  getWork: (id: string) => Promise<unknown>;
};

type SearchResponse = {
  results?: unknown;
  message?: unknown;
};

export function createCoreClient(options: {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): CoreClient {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async searchWorks(params) {
      const response = await fetchImpl(`${baseUrl}/search/works`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: params.q,
          limit: params.limit,
          offset: params.offset ?? 0,
          sort: params.sort,
          exclude: ['fullText'],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const payload = (await response.json()) as SearchResponse;

      if (!response.ok) {
        const detail =
          typeof payload.message === 'string'
            ? payload.message
            : response.statusText;
        throw new Error(`CORE search failed (${response.status}): ${detail}`);
      }

      return Array.isArray(payload.results) ? payload.results : [];
    },
    async getWork(id) {
      const response = await fetchImpl(
        `${baseUrl}/works/${encodeURIComponent(id)}?exclude=fullText`,
        {
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );

      const payload = (await response.json()) as SearchResponse & {
        id?: unknown;
      };

      if (!response.ok) {
        const detail =
          typeof payload.message === 'string'
            ? payload.message
            : response.statusText;
        throw new Error(`CORE work failed (${response.status}): ${detail}`);
      }

      return payload;
    },
  };
}
