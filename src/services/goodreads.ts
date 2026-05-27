import { decode } from 'html-entities';

const CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest=';

export type GoodreadsMetadata = {
  title: string;
  author: string;
  isbn?: string;
  pages?: number | null;
  goodreadsId: string;
  pubDate?: string | null;
};

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('goodreads.com') && parsed.pathname.includes('/book/show/');
  } catch {
    return false;
  }
}

function extractGoodreadsId(url: string): string | null {
  const match = url.match(/\/show\/(\d+)/);
  return match ? match[1] : null;
}

function extractPublicationDate(html: string): string | null {
  const match = html.match(/First published[:\s]+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/i);
  if (!match) return null;

  const monthStr = match[1];
  const day = match[2];
  const year = match[3];

  const months: Record<string, string> = {
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12',
  };

  const month = months[monthStr.toLowerCase()];
  if (!month) return null;

  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

export async function fetchBookMetadata(url: string): Promise<GoodreadsMetadata> {
  if (!validateUrl(url)) {
    throw new Error('Invalid Goodreads URL. Please use a book detail page URL (e.g., goodreads.com/book/show/*)');
  }

  const goodreadsId = extractGoodreadsId(url);
  if (!goodreadsId) {
    throw new Error('Could not extract Goodreads ID from URL');
  }

  const encodedUrl = encodeURIComponent(url);

  let response: Response;
  try {
    response = await fetch(`${CORS_PROXY}${encodedUrl}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        Referer: 'https://www.goodreads.com/',
      },
    });
  } catch (err: any) {
    throw new Error('Failed to fetch Goodreads page. Check your internet connection.');
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  let html: string;
  try {
    html = await response.text();
  } catch (err: any) {
    throw new Error('Failed to read page content');
  }

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">({.*?})<\/script>/s);
  if (!jsonLdMatch) {
    throw new Error('No book metadata found on this page. Ensure it is a valid Goodreads book detail page.');
  }

  let jsonLd: any;
  try {
    jsonLd = JSON.parse(jsonLdMatch[1]);
  } catch (err: any) {
    throw new Error('Failed to parse book metadata from the page');
  }

  if (!jsonLd.name || !jsonLd.author) {
    throw new Error('Missing required metadata (title or author) on this page');
  }

  const authors = Array.isArray(jsonLd.author) ? jsonLd.author : [jsonLd.author];
  const firstAuthor = authors[0];
  const authorName = typeof firstAuthor === 'string' ? firstAuthor : firstAuthor?.name || '';

  if (!authorName) {
    throw new Error('Could not extract author from page metadata');
  }

  const pubDate = extractPublicationDate(html);

  return {
    title: decode(jsonLd.name),
    author: decode(authorName),
    ...(jsonLd.isbn && { isbn: jsonLd.isbn }),
    pages: jsonLd.numberOfPages || null,
    goodreadsId,
    pubDate,
  };
}
