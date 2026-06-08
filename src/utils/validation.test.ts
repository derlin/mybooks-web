// @ts-nocheck
import { describe, expect, it } from 'vitest';
import {
  checkDuplicateTitle,
  durationToMinutes,
  formatDateString,
  getFilteredAuthors,
  getTodayDate,
  hasFormChanged,
  isValidAuthor,
  isValidTitle,
  minutesToDuration,
  validateDuration,
  validateForm,
} from './validation';

describe('Form Validation Utilities', () => {
  describe('isValidTitle', () => {
    it('returns true for non-empty title', () => {
      expect(isValidTitle('The Hobbit')).toBe(true);
      expect(isValidTitle('A')).toBe(true);
    });

    it('returns false for empty title', () => {
      expect(isValidTitle('')).toBe(false);
    });

    it('returns false for whitespace-only title', () => {
      expect(isValidTitle('   ')).toBe(false);
      expect(isValidTitle('\t\n')).toBe(false);
    });

    it('trims before validating', () => {
      expect(isValidTitle('  Title  ')).toBe(true);
    });
  });

  describe('isValidAuthor', () => {
    it('returns true for non-empty author', () => {
      expect(isValidAuthor('Tolkien')).toBe(true);
      expect(isValidAuthor('J.R.R. Tolkien')).toBe(true);
    });

    it('returns false for empty author', () => {
      expect(isValidAuthor('')).toBe(false);
    });

    it('returns false for whitespace-only author', () => {
      expect(isValidAuthor('   ')).toBe(false);
    });

    it('trims before validating', () => {
      expect(isValidAuthor('  Author  ')).toBe(true);
    });
  });

  describe('validateDuration', () => {
    it('validates valid duration formats', () => {
      const result1 = validateDuration('7h');
      expect(result1.isValid).toBe(true);
      expect(result1.formatted).toBe('7h00');

      const result2 = validateDuration('7h34');
      expect(result2.isValid).toBe(true);
      expect(result2.formatted).toBe('7h34');

      const result3 = validateDuration('12h59');
      expect(result3.isValid).toBe(true);
      expect(result3.formatted).toBe('12h59');
    });

    it('normalizes single-digit minutes with padding', () => {
      const result = validateDuration('7h5');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('7h05');
    });

    it('returns error for invalid format', () => {
      const result = validateDuration('7:34');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Format');
    });

    it('returns error for invalid minutes (60+)', () => {
      const result = validateDuration('7h60');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Minutes must be 0-59');
    });

    it('returns error for 3+ digit minutes (invalid format)', () => {
      const result = validateDuration('7h100');
      expect(result.isValid).toBe(false);
      // Regex only accepts 1-2 digits for minutes, so this is format error
      expect(result.error).toContain('Format');
    });

    it('accepts empty duration (optional field)', () => {
      const result1 = validateDuration('');
      expect(result1.isValid).toBe(true);
      expect(result1.formatted).toBeUndefined();

      const result2 = validateDuration('   ');
      expect(result2.isValid).toBe(true);
    });

    it('rejects text in duration', () => {
      const result = validateDuration('7 hours');
      expect(result.isValid).toBe(false);
    });

    it('handles zero hours', () => {
      const result = validateDuration('0h30');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('0h30');
    });
  });

  describe('durationToMinutes', () => {
    it('converts valid durations to minutes', () => {
      expect(durationToMinutes('7h34')).toBe(454); // 7*60 + 34
      expect(durationToMinutes('1h00')).toBe(60);
      expect(durationToMinutes('12h30')).toBe(750); // 12*60 + 30
    });

    it('handles zero minutes', () => {
      expect(durationToMinutes('5h00')).toBe(300);
    });

    it('handles zero hours', () => {
      expect(durationToMinutes('0h30')).toBe(30);
    });

    it('returns null for invalid format', () => {
      expect(durationToMinutes('invalid')).toBeNull();
      expect(durationToMinutes('7:34')).toBeNull();
    });

    it('returns null for empty duration', () => {
      expect(durationToMinutes('')).toBeNull();
      expect(durationToMinutes(null)).toBeNull();
    });

    it('handles format without minutes', () => {
      expect(durationToMinutes('7h')).toBe(420); // 7*60
    });
  });

  describe('minutesToDuration', () => {
    it('converts minutes to duration string', () => {
      expect(minutesToDuration(454)).toBe('7h34');
      expect(minutesToDuration(60)).toBe('1h00');
      expect(minutesToDuration(750)).toBe('12h30');
    });

    it('handles zero minutes', () => {
      expect(minutesToDuration(0)).toBe('');
    });

    it('handles single-digit minutes', () => {
      expect(minutesToDuration(65)).toBe('1h05');
      expect(minutesToDuration(30)).toBe('0h30');
    });

    it('returns empty string for null/undefined', () => {
      expect(minutesToDuration(null)).toBe('');
      expect(minutesToDuration(undefined)).toBe('');
    });

    it('returns empty string for negative minutes', () => {
      expect(minutesToDuration(-30)).toBe('');
    });
  });

  describe('formatDateString', () => {
    it('formats date with zero-padding', () => {
      expect(formatDateString('2025-1-5')).toBe('2025-01-05');
      expect(formatDateString('2025-1')).toBe('2025-01');
      expect(formatDateString('2025-12-1')).toBe('2025-12-01');
    });

    it('returns year-only dates as-is', () => {
      expect(formatDateString('2025')).toBe('2025');
      expect(formatDateString('2020')).toBe('2020');
    });

    it('returns question mark as-is', () => {
      expect(formatDateString('?')).toBe('?');
    });

    it('pads month only when given two parts', () => {
      expect(formatDateString('2025-3')).toBe('2025-03');
      expect(formatDateString('2025-12')).toBe('2025-12');
    });

    it('pads month and day with three parts', () => {
      expect(formatDateString('2025-1-1')).toBe('2025-01-01');
      expect(formatDateString('2025-12-25')).toBe('2025-12-25');
    });

    it('returns invalid formats as-is', () => {
      expect(formatDateString('invalid')).toBe('invalid');
      expect(formatDateString('2025-1-1-1')).toBe('2025-1-1-1');
    });

    it('trims whitespace', () => {
      expect(formatDateString('  2025-1  ')).toBe('2025-01');
    });

    it('returns empty string for empty input', () => {
      expect(formatDateString('')).toBe('');
      expect(formatDateString('   ')).toBe('');
    });
  });

  describe('getTodayDate', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const date = getTodayDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("returns today's date", () => {
      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(getTodayDate()).toBe(expected);
    });

    it('always pads month and day with zeros', () => {
      // Just check format, not the actual values
      const date = getTodayDate();
      const parts = date.split('-');
      expect(parts[1].length).toBe(2);
      expect(parts[2].length).toBe(2);
    });
  });

  describe('hasFormChanged', () => {
    it('returns false for identical objects', () => {
      const form = { title: 'Test', author: 'Author', date: '2025' };
      expect(hasFormChanged(form, form)).toBe(false);
    });

    it('returns false for deeply equal objects', () => {
      const form1 = { title: 'Test', author: 'Author', meta: { pages: 100 } };
      const form2 = { title: 'Test', author: 'Author', meta: { pages: 100 } };
      expect(hasFormChanged(form1, form2)).toBe(false);
    });

    it('returns true when title changed', () => {
      const original = { title: 'Original', author: 'Author' };
      const current = { title: 'Changed', author: 'Author' };
      expect(hasFormChanged(current, original)).toBe(true);
    });

    it('returns true when metadata changed', () => {
      const original = { title: 'Test', meta: { pages: 100 } };
      const current = { title: 'Test', meta: { pages: 200 } };
      expect(hasFormChanged(current, original)).toBe(true);
    });

    it('detects nested property changes', () => {
      const original = { title: 'Test', meta: { duration: null } };
      const current = { title: 'Test', meta: { duration: '7h30' } };
      expect(hasFormChanged(current, original)).toBe(true);
    });
  });

  describe('validateForm', () => {
    it('returns valid for complete form', () => {
      const form = { title: 'Test', author: 'Author', meta: { duration: '7h30' } };
      const result = validateForm(form);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('returns error for missing title', () => {
      const form = { title: '   ', author: 'Author', meta: {} };
      const result = validateForm(form);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBeDefined();
    });

    it('returns error for missing author', () => {
      const form = { title: 'Title', author: '', meta: {} };
      const result = validateForm(form);
      expect(result.isValid).toBe(false);
      expect(result.errors.author).toBeDefined();
    });

    it('returns error for invalid duration', () => {
      const form = { title: 'Title', author: 'Author', meta: { duration: '7:30' } };
      const result = validateForm(form);
      expect(result.isValid).toBe(false);
      expect(result.errors.duration).toBeDefined();
    });

    it('collects multiple errors', () => {
      const form = { title: '', author: '   ', meta: { duration: 'invalid' } };
      const result = validateForm(form);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBe(3);
    });

    it('allows empty optional duration', () => {
      const form = { title: 'Title', author: 'Author', meta: { duration: '' } };
      const result = validateForm(form);
      expect(result.isValid).toBe(true);
    });
  });

  describe('getFilteredAuthors', () => {
    const allBooks = [
      { title: 'Book 1', author: 'Tolkien' },
      { title: 'Book 2', author: 'George Orwell' },
      { title: 'Book 3', author: 'Frank Herbert' },
      { title: 'Book 4', author: 'Isaac Asimov' },
    ];

    it('filters authors by partial match', () => {
      const result = getFilteredAuthors('george', allBooks);
      expect(result).toEqual(['George Orwell']);
    });

    it('filters case-insensitively', () => {
      const result = getFilteredAuthors('TOLKIEN', allBooks);
      expect(result).toEqual(['Tolkien']);
    });

    it('returns multiple matches sorted', () => {
      const result = getFilteredAuthors('e', allBooks);
      // Authors containing 'e': George Orwell, Frank Herbert, Tolkien
      expect(result).toContain('George Orwell');
      expect(result).toContain('Frank Herbert');
      expect(result).toContain('Tolkien');
      expect(result).not.toContain('Isaac Asimov'); // No 'e' in Asimov
      expect(result).toHaveLength(3);
      // Check sorted
      expect(result).toEqual([...result].sort());
    });

    it('returns empty array for empty query', () => {
      const result = getFilteredAuthors('', allBooks);
      expect(result).toEqual([]);
    });

    it('returns empty array for no matches', () => {
      const result = getFilteredAuthors('xyz', allBooks);
      expect(result).toEqual([]);
    });

    it('removes duplicates', () => {
      const booksWithDuplicates = [
        { title: 'Book 1', author: 'Tolkien' },
        { title: 'Book 2', author: 'Tolkien' },
        { title: 'Book 3', author: 'Orwell' },
      ];
      const result = getFilteredAuthors('tol', booksWithDuplicates);
      expect(result).toEqual(['Tolkien']);
    });

    it('filters out empty author names', () => {
      const booksWithEmpty = [
        { title: 'Book 1', author: 'Tolkien' },
        { title: 'Book 2', author: '' },
        { title: 'Book 3', author: null },
      ];
      const result = getFilteredAuthors('o', booksWithEmpty);
      expect(result).toEqual(['Tolkien']);
    });
  });

  describe('Duration Conversion Round-trips', () => {
    it('converts back and forth: minutes → duration → minutes', () => {
      const minutes = 454;
      const duration = minutesToDuration(minutes);
      const roundTrip = durationToMinutes(duration);
      expect(roundTrip).toBe(minutes);
    });

    it('converts back and forth: duration → minutes → duration', () => {
      const duration = '7h34';
      const minutes = durationToMinutes(duration);
      const roundTrip = minutesToDuration(minutes);
      expect(roundTrip).toBe(duration);
    });
  });

  describe('Date Formatting Idempotency', () => {
    it('formatting twice gives same result', () => {
      const date = '2025-1-5';
      const once = formatDateString(date);
      const twice = formatDateString(once);
      expect(twice).toBe(once);
    });
  });

  describe('checkDuplicateTitle', () => {
    const mockBooks = [
      { _key: 'the hobbit', title: 'The Hobbit', author: 'Tolkien' },
      { _key: 'the lord of the rings', title: 'The Lord of the Rings', author: 'Tolkien' },
    ];

    it('allows new book with unique title', () => {
      const result = checkDuplicateTitle('Harry Potter', mockBooks);
      expect(result.isDuplicate).toBe(false);
      expect(result.error).toBeNull();
    });

    it('blocks new book with duplicate title', () => {
      const result = checkDuplicateTitle('The Hobbit', mockBooks);
      expect(result.isDuplicate).toBe(true);
      expect(result.error).toBe('A book with this title already exists');
    });

    it('allows edit to keep same title', () => {
      const result = checkDuplicateTitle('The Hobbit', mockBooks, 'the hobbit');
      expect(result.isDuplicate).toBe(false);
      expect(result.error).toBeNull();
    });

    it('allows edit to rename to new title', () => {
      const result = checkDuplicateTitle('Harry Potter', mockBooks, 'the hobbit');
      expect(result.isDuplicate).toBe(false);
      expect(result.error).toBeNull();
    });

    it('blocks edit to rename to existing title', () => {
      const result = checkDuplicateTitle('The Lord of the Rings', mockBooks, 'the hobbit');
      expect(result.isDuplicate).toBe(true);
      expect(result.error).toBe('A book with this title already exists');
    });

    it('handles empty books array', () => {
      const result = checkDuplicateTitle('Any Title', []);
      expect(result.isDuplicate).toBe(false);
      expect(result.error).toBeNull();
    });
  });
});
