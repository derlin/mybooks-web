import type { Book } from '../types';

/**
 * Ordered list of cover URLs to try for a book: the stored one first, then a
 * lookup by ISBN on Open Library. `default=false` makes Open Library answer
 * with a 404 instead of a blank 1px image, which is what lets a consumer fall
 * through to the next candidate on error.
 */
export const coverCandidates = (coverImage?: string | null, isbn?: string | null): string[] => {
  const candidates: string[] = [];
  if (coverImage) {
    candidates.push(coverImage);
  }
  if (isbn) {
    const cleaned = isbn.replace(/[^0-9Xx]/g, '');
    if (cleaned) {
      candidates.push(`https://covers.openlibrary.org/b/isbn/${cleaned}-L.jpg?default=false`);
    }
  }
  return candidates;
};

const prefetched = new Set<string>();

/**
 * Warm the browser cache for a book cover before the details drawer opens, so
 * the cover is already there on click. Only the stored URL is prefetched: the
 * Open Library fallback is rate limited per IP, so it stays on demand.
 */
export const prefetchCover = (book: Book): void => {
  const url = book.cover_image;
  if (!url || prefetched.has(url)) return;
  prefetched.add(url);
  const img = new Image();
  img.src = url;
};
