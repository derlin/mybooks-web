import { GOODREADS_FETCHER_API_KEY, GOODREADS_FETCHER_URL } from '../env';

export type GoodreadsMetadata = {
  goodreadsId: string;
  title: string;
  author: string;
  description?: string;
  isbn?: string;
  pages?: number | null;
  pubDate?: string | null;
  genres: string[];
};

export type StorygraphMetadata = {
  id: string;
  title: string;
  authors: string[];
  description?: string | null;
  isbn?: string;
  pages?: number | null;
  pubDate?: string | null;
  genres: string[];
};

async function fetchFromProxy(proxyUrl: string): Promise<any> {
  const headers: Record<string, string> = {
    'X-Api-Key': GOODREADS_FETCHER_API_KEY,
  };

  try {
    const response = await fetch(proxyUrl, { headers });
    const parsed = await response.json();
    if (!parsed) {
      throw new Error('No data returned from Goodreads fetcher');
    }
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    return parsed;
  } catch (err: any) {
    console.error(`Network error while fetching page from ${proxyUrl}:`, err);
    throw new Error(`Failed to fetch page from ${proxyUrl}. Retry in a few seconds.`);
  }
}

export async function fetchGoodreadsBookMetadata(url: string): Promise<GoodreadsMetadata> {
  const proxyUrl = `${GOODREADS_FETCHER_URL}/goodreads/metadata?url=${url}`;
  return fetchFromProxy(proxyUrl);
}

export async function fetchStorygraphMetadata(query: string): Promise<StorygraphMetadata> {
  const proxyUrl = `${GOODREADS_FETCHER_URL}/storygraph/search?query=${query}`;
  return fetchFromProxy(proxyUrl);
}
