import { GOODREADS_FETCHER_API_KEY, GOODREADS_FETCHER_URL } from '../env';

export type GoodreadsMetadata = {
  title: string;
  author: string;
  isbn?: string;
  pages?: number | null;
  goodreadsId: string;
  pubDate?: string | null;
};

export async function fetchBookMetadata(url: string): Promise<GoodreadsMetadata> {
  const proxyUrl = `${GOODREADS_FETCHER_URL}${url}`;
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
      throw new Error(parsed.errror);
    }
    return parsed;
  } catch (err: any) {
    console.error(`Network error while fetching page from ${proxyUrl}:`, err);
    throw new Error(`Failed to fetch Goodreads page from ${proxyUrl}. Retry in a few seconds.`);
  }
}
