import type { Book } from '../types';

export type CoverOptions = { width?: number };

// Goodreads serves covers from both of these, with the same `._SX240_` sizing scheme.
const AMAZON_HOSTS = ['m.media-amazon.com', 'i.gr-assets.com'];
const AMAZON_SIZE_SEGMENT = /\._S[XY]\d+_/;

/** Width the details drawer renders its cover at, and therefore what we prefetch. */
export const DRAWER_COVER_WIDTH = 320;

/**
 * Apply a target pixel width to a cover URL, sized appropriately for whichever
 * CDN hosts it. Only ever downsizes, so it is safe to apply unconditionally.
 */
export const sizedCoverUrl = (url: string, width?: number): string => {
  if (!width) return url;

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return url;
  }

  if (AMAZON_HOSTS.includes(host)) {
    const suffix = `._SX${width}_`;
    if (AMAZON_SIZE_SEGMENT.test(url)) {
      return url.replace(AMAZON_SIZE_SEGMENT, suffix);
    }
    return url.replace(/\.jpg$/i, `${suffix}.jpg`);
  }

  if (host === 'covers.openlibrary.org') {
    const sizeLetter = width <= 180 ? 'M' : 'L';
    return url.replace(/-[SML]\.jpg/, `-${sizeLetter}.jpg`);
  }

  return url;
};

/**
 * Ordered list of cover URLs to try for a book: the stored one first, then a
 * lookup by ISBN on Open Library. `default=false` makes Open Library answer
 * with a 404 instead of a blank 1px image, which is what lets a consumer fall
 * through to the next candidate on error.
 */
export const coverCandidates = (
  coverImage?: string | null,
  isbn?: string | null,
  { width }: CoverOptions = {}
): string[] => {
  const candidates: string[] = [];
  if (coverImage) {
    candidates.push(sizedCoverUrl(coverImage, width));
  }
  if (isbn) {
    const cleaned = isbn.replace(/[^0-9Xx]/g, '');
    if (cleaned) {
      candidates.push(sizedCoverUrl(`https://covers.openlibrary.org/b/isbn/${cleaned}-L.jpg?default=false`, width));
    }
  }
  return candidates;
};

const prefetched = new Set<string>();

/**
 * Warm the browser cache for a book cover before the details drawer opens, so
 * the cover is already there on click. Sized to DRAWER_COVER_WIDTH: a different
 * width is a different URL, so prefetching the raw one would never be a hit.
 * Only the stored URL is prefetched: the Open Library fallback is rate limited
 * per IP, so it stays on demand.
 */
export const prefetchCover = (book: Book): void => {
  if (!book.cover_image) return;
  const url = sizedCoverUrl(book.cover_image, DRAWER_COVER_WIDTH);
  if (prefetched.has(url)) return;
  prefetched.add(url);
  const img = new Image();
  img.src = url;
};
