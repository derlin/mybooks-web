// @ts-nocheck
import { describe, expect, it } from 'vitest';
import * as helpers from './helpers';

describe('normalizeTitle', () => {
  const cases = [
    // Case normalization
    ['THE HOBBIT', 'the hobbit'],
    ['ThE LoRd Of ThE RiNgS!!!', 'the lord of the rings'],
    // Diacritics
    ['À Tue Et À Toi', 'a tue et a toi'],
    ['Café', 'cafe'],
    ['Naïve', 'naive'],
    ['José García', 'jose garcia'],
    ['Napoléon Bonaparte', 'napoleon bonaparte'],
    // Special characters
    ["Harry Potter: The Philosopher's Stone", 'harry potter the philosopher s stone'],
    ['2001: A Space Odyssey', '2001 a space odyssey'],
    ["Don't Stop Believin'", 'don t stop believin'],
    ['"Quoted Title"', 'quoted title'],
    ['Life-Changing Moment', 'life changing moment'],
    ['Twenty—En Dashes', 'twenty en dashes'],
    // Spaces
    ['the   hobbit', 'the hobbit'],
    ['title  with   multiple    spaces', 'title with multiple spaces'],
    ['  the hobbit  ', 'the hobbit'],
    // Numbers
    ['1984', '1984'],
    ['The 39 Steps', 'the 39 steps'],
    // Edge cases
    ['', ''],
    ['   ', ''],
  ];

  it.each(cases)('%s => %s', (input, expected) => {
    expect(helpers.normalizeTitle(input)).toBe(expected);
  });
});

describe('formatDate', () => {
  const cases = [
    // Full dates
    ['2025-01-15', 'Jan 15, 2025'],
    ['2024-12-25', 'Dec 25, 2024'],
    ['2020-06-01', 'Jun 01, 2020'],
    // Year-month
    ['2025-01', 'Jan 2025'],
    ['2024-12', 'Dec 2024'],
    ['2020-06', 'Jun 2020'],
    // Year only
    ['2025', '2025'],
    ['2020', '2020'],
    ['1999', '1999'],
    // Special values
    ['?', '?'],
    // Empty/null
    [null, '—'],
    [undefined, '—'],
    ['', '—'],
    // Non-standard
    ['invalid', 'invalid'],
    ['??', '??'],
    ['New Zealand', 'New Zealand'],
    // Boundary dates
    ['2025-01-01', 'Jan 01, 2025'],
    ['2025-12-31', 'Dec 31, 2025'],
    ['2024-02-29', 'Feb 29, 2024'],
  ];

  it.each(cases)('%s => %s', (input, expected) => {
    expect(helpers.formatDate(input)).toBe(expected);
  });
});

describe('formatDuration', () => {
  const cases = [
    // Basic conversions
    [60, '1:00'],
    [90, '1:30'],
    [450, '7:30'],
    // Padding
    [61, '1:01'],
    [65, '1:05'],
    [605, '10:05'],
    // Multiple hours
    [120, '2:00'],
    [600, '10:00'],
    // Edge cases
    [0, ''],
    [null, ''],
    [undefined, ''],
    [1, '0:01'],
    [59, '0:59'],
    [1440, '24:00'],
    [2880, '48:00'],
  ];

  it.each(cases)('%s => %s', (input, expected) => {
    expect(helpers.formatDuration(input)).toBe(expected);
  });
});

describe('formatDateString', () => {
  const cases = [
    ['2025-01-15', '2025-01-15'],
    ['2025-1-5', '2025-01-05'],
    ['2025-1', '2025-01'],
    ['2025', '2025'],
    ['?', '?'],
    ['', ''],
    ['  ', ''],
    ['invalid', 'invalid'],
  ];

  it.each(cases)('%s => %s', (input, expected) => {
    expect(helpers.formatDateString(input)).toBe(expected);
  });
});

describe('durationToMinutes', () => {
  const cases = [
    // Valid conversions
    ['1h0', 60],
    ['1h30', 90],
    ['7h34', 454],
    ['0h1', 1],
    ['10h59', 659],
    ['1h60', 120], // Regex allows up to 2 digits, so 1h60 matches and converts to 120
    // Invalid/empty
    ['', null],
    [null, null],
    [undefined, null],
    ['invalid', null],
    ['7h100', null], // Regex rejects 3+ digits
  ];

  it.each(cases)('%s => %s', (input, expected) => {
    expect(helpers.durationToMinutes(input)).toBe(expected);
  });
});

describe('minutesToDuration', () => {
  const cases = [
    // Conversions
    [60, '1h00'],
    [90, '1h30'],
    [454, '7h34'],
    [1, '0h01'],
    [659, '10h59'],
    // Edge cases
    [0, ''],
    [null, ''],
    [undefined, ''],
    [-1, ''],
  ];

  it.each(cases)('%s => %s', (input, expected) => {
    expect(helpers.minutesToDuration(input)).toBe(expected);
  });
});

describe('validateDuration', () => {
  const cases = [
    // Valid formats
    ['7h34', { error: undefined, formatted: '7h34' }],
    ['1h0', { error: undefined, formatted: '1h00' }],
    ['10h59', { error: undefined, formatted: '10h59' }],
    ['0h1', { error: undefined, formatted: '0h01' }],
    // Empty
    ['', { error: undefined, formatted: undefined }],
    ['  ', { error: undefined, formatted: undefined }],
    // Invalid format
    ['invalid', { error: 'Format: Xh or Xh:MM (e.g., 7h34)' }],
    ['7h100', { error: 'Format: Xh or Xh:MM (e.g., 7h34)' }], // 3+ digits don't match regex
    // Invalid minutes
    ['1h60', { error: 'Minutes must be 0-59' }],
    ['0h99', { error: 'Minutes must be 0-59' }],
  ];

  it.each(cases)('%s', (input, expected) => {
    const result = helpers.validateDuration(input);
    expect(result.error).toBe(expected.error);
    expect(result.formatted).toBe(expected.formatted);
  });
});

describe('isValidRating', () => {
  const cases = [
    // Valid ratings
    [0, true],
    [1, true],
    [2.5, true],
    [5, true],
    [3.7, true],
    // Invalid
    [-1, false],
    [6, false],
    [NaN, true], // NaN is treated as falsy, returns true
    // Empty/null
    [null, true],
    [undefined, true],
  ];

  it.each(cases)('%s => %s', (input, expected) => {
    expect(helpers.isValidRating(input)).toBe(expected);
  });
});

describe('getTodayDate', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const result = helpers.getTodayDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a valid date string', () => {
    const result = helpers.getTodayDate();
    const date = new Date(result);
    expect(date.toString()).not.toBe('Invalid Date');
  });
});

describe('checkDuplicateTitle', () => {
  const mockBooks = [
    { _key: 'the hobbit', title: 'The Hobbit', author: 'Tolkien' },
    { _key: 'dune', title: 'Dune', author: 'Frank Herbert' },
  ];

  const cases = [
    // Duplicates
    ['The Hobbit', mockBooks, undefined, true, 'A book with this title already exists'],
    ['the hobbit', mockBooks, undefined, true, 'A book with this title already exists'],
    // Not duplicates
    ['New Book', mockBooks, undefined, false, null],
    ['1984', mockBooks, undefined, false, null],
    // Same title but different key (e.g., editing same book)
    ['The Hobbit', mockBooks, 'the hobbit', false, null],
  ];

  it.each(cases)('%s', (title, books, currentKey, isDuplicate, error) => {
    const result = helpers.checkDuplicateTitle(title, books, currentKey);
    expect(result.isDuplicate).toBe(isDuplicate);
    expect(result.error).toBe(error);
  });
});

describe('getFilteredAuthors', () => {
  const mockBooks = [
    { author: 'J.R.R. Tolkien' },
    { author: 'Frank Herbert' },
    { author: 'Isaac Asimov' },
    { author: 'J.K. Rowling' },
    { author: undefined },
    { author: '' },
  ];

  const cases = [
    // Substring matching (case insensitive)
    ['j', ['J.K. Rowling', 'J.R.R. Tolkien']], // Only authors containing 'j'
    ['frank', ['Frank Herbert']],
    ['asimov', ['Isaac Asimov']],
    ['tolkien', ['J.R.R. Tolkien']],
    ['herbe', ['Frank Herbert']],
    // No matches
    ['xyz', []],
    ['', []],
    // Case insensitive
    ['TOLKIEN', ['J.R.R. Tolkien']],
  ];

  it.each(cases)('%s', (query, expected) => {
    const result = helpers.getFilteredAuthors(query, mockBooks);
    expect(result).toEqual(expected);
  });
});

describe('isValidUrl', () => {
  const cases = [
    // Valid URLs
    ['http://example.com', true],
    ['https://www.goodreads.com/book/show/123456', true],
    ['https://app.thestorygraph.com/books/xyz', true],
    ['https://example.co.uk?query=lala&foo=1', true],
    // Empty/whitespace (treated as valid - optional field)
    ['', true],
    ['  ', true],
    // Invalid URLs
    ['not a url', false],
    ['ht!tp://example.com', false],
    ['example.com', false],
    ['://', false],
    ['https://ex', false],
  ];

  it.each(cases)('%s => %s', (url, expected) => {
    expect(helpers.isValidUrl(url)).toBe(expected);
  });
});
