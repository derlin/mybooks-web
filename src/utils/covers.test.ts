// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { coverCandidates } from './covers';

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
