// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { coverCandidates, sizedCoverUrl } from './covers';

describe('coverCandidates', () => {
  const openLibrary = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

  it('returns nothing when there is neither a cover nor an ISBN', () => {
    expect(coverCandidates(undefined, undefined)).toEqual([]);
    expect(coverCandidates('', '')).toEqual([]);
    expect(coverCandidates(null, null)).toEqual([]);
  });

  it('puts the stored cover first', () => {
    expect(coverCandidates('https://example.com/cover.jpg', '9780765326355')).toEqual([
      'https://example.com/cover.jpg',
      openLibrary('9780765326355'),
    ]);
  });

  it('falls back to Open Library when there is no stored cover', () => {
    expect(coverCandidates(null, '9780765326355')).toEqual([openLibrary('9780765326355')]);
  });

  it('strips separators from the ISBN but keeps the X check digit', () => {
    expect(coverCandidates(null, '0-306-40615-X')).toEqual([openLibrary('030640615X')]);
    expect(coverCandidates(null, '978 0 7653 2635 5')).toEqual([openLibrary('9780765326355')]);
  });

  it('ignores an ISBN with no usable characters', () => {
    expect(coverCandidates(null, '---')).toEqual([]);
  });
});

describe('sizedCoverUrl', () => {
  it('inserts the width suffix into an Amazon URL', () => {
    expect(sizedCoverUrl('https://m.media-amazon.com/images/I/abc.jpg', 240)).toBe(
      'https://m.media-amazon.com/images/I/abc._SX240_.jpg'
    );
  });

  it('sizes the gr-assets host the same way as media-amazon', () => {
    expect(sizedCoverUrl('https://i.gr-assets.com/images/S/compressed.photo/abc._SY475_.jpg', 240)).toBe(
      'https://i.gr-assets.com/images/S/compressed.photo/abc._SX240_.jpg'
    );
  });

  it('leaves a non-Amazon URL untouched', () => {
    expect(sizedCoverUrl('https://example.com/cover.jpg', 240)).toBe('https://example.com/cover.jpg');
  });

  it('replaces an existing size segment instead of appending a second one', () => {
    expect(sizedCoverUrl('https://m.media-amazon.com/images/I/abc._SX160_.jpg', 240)).toBe(
      'https://m.media-amazon.com/images/I/abc._SX240_.jpg'
    );
    expect(sizedCoverUrl('https://m.media-amazon.com/images/I/abc._SY160_.jpg', 240)).toBe(
      'https://m.media-amazon.com/images/I/abc._SX240_.jpg'
    );
  });

  it('maps the requested width to the nearest Open Library size letter', () => {
    expect(sizedCoverUrl('https://covers.openlibrary.org/b/isbn/123-L.jpg?default=false', 120)).toBe(
      'https://covers.openlibrary.org/b/isbn/123-M.jpg?default=false'
    );
    expect(sizedCoverUrl('https://covers.openlibrary.org/b/isbn/123-L.jpg?default=false', 180)).toBe(
      'https://covers.openlibrary.org/b/isbn/123-M.jpg?default=false'
    );
    expect(sizedCoverUrl('https://covers.openlibrary.org/b/isbn/123-L.jpg?default=false', 240)).toBe(
      'https://covers.openlibrary.org/b/isbn/123-L.jpg?default=false'
    );
  });

  it('returns the URL untouched when no width is given', () => {
    expect(sizedCoverUrl('https://m.media-amazon.com/images/I/abc.jpg')).toBe(
      'https://m.media-amazon.com/images/I/abc.jpg'
    );
  });
});

describe('sizedCoverUrl anchoring', () => {
  it('only suffixes the extension, not an earlier .jpg in the path', () => {
    expect(sizedCoverUrl('https://m.media-amazon.com/images/x.jpg.thumb/abc.jpg', 240)).toBe(
      'https://m.media-amazon.com/images/x.jpg.thumb/abc._SX240_.jpg'
    );
  });
});
