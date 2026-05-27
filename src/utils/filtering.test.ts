// @ts-nocheck
import {
  extractDateNumbers,
  applyDnfFilter,
  applyFormatFilter,
  applySearchFilter,
  sortBooks,
  filterAndSort,
} from './filtering';

describe('Filtering Utilities', () => {
  const mockBooks = [
    {
      _key: 'the-hobbit',
      title: 'The Hobbit',
      author: 'Tolkien',
      date: '2020-06-15',
      dnf: false,
      notes: 'An adventure story',
      meta: { pages: 310 },
    },
    {
      _key: 'dune',
      title: 'Dune',
      author: 'Frank Herbert',
      date: '2021-03',
      dnf: false,
      notes: 'Epic sci-fi',
      meta: { pages: 682, duration: 720 }, // Audiobook
    },
    {
      _key: '1984',
      title: '1984',
      author: 'George Orwell',
      date: '2019',
      dnf: true, // Did not finish
      notes: 'Dystopian novel',
      meta: { pages: 328 },
    },
    {
      _key: 'foundation',
      title: 'Foundation',
      author: 'Isaac Asimov',
      date: '??', // Non-standard date
      dnf: false,
      notes: 'Space empire foundation',
      meta: { pages: 255 },
    },
  ];

  describe('extractDateNumbers', () => {
    it('extracts numbers from standard dates', () => {
      expect(extractDateNumbers('2020-06-15')).toBe('20200615');
      expect(extractDateNumbers('2021-03')).toBe('202103');
      expect(extractDateNumbers('2019')).toBe('2019');
    });

    it('extracts numbers from non-standard dates', () => {
      expect(extractDateNumbers('??')).toBe('');
      expect(extractDateNumbers('New Zealand')).toBe('');
    });

    it('returns empty string for falsy values', () => {
      expect(extractDateNumbers('')).toBe('');
      expect(extractDateNumbers(null)).toBe('');
      expect(extractDateNumbers(undefined)).toBe('');
    });

    it('handles mixed alphanumeric strings', () => {
      expect(extractDateNumbers('2020abc2021')).toBe('20202021');
    });
  });

  describe('applyDnfFilter', () => {
    it('filters to only DNF books', () => {
      const result = applyDnfFilter(mockBooks, 'dnf');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('1984');
      expect(result[0].dnf).toBe(true);
    });

    it('filters to only finished books', () => {
      const result = applyDnfFilter(mockBooks, 'finished');
      expect(result).toHaveLength(3);
      expect(result.every((b) => !b.dnf)).toBe(true);
    });

    it('returns all books when filter is "all"', () => {
      const result = applyDnfFilter(mockBooks, 'all');
      expect(result).toHaveLength(4);
    });

    it('returns all books for unknown filter value', () => {
      const result = applyDnfFilter(mockBooks, 'unknown');
      expect(result).toHaveLength(4);
    });
  });

  describe('applyFormatFilter', () => {
    it('filters to only audiobooks', () => {
      const result = applyFormatFilter(mockBooks, 'audiobook');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Dune');
      expect(result[0].meta?.duration).toBe(720);
    });

    it('filters to only paper books', () => {
      const result = applyFormatFilter(mockBooks, 'paper');
      expect(result).toHaveLength(3);
      expect(result.every((b) => !b.meta?.duration)).toBe(true);
    });

    it('returns all books when filter is "all"', () => {
      const result = applyFormatFilter(mockBooks, 'all');
      expect(result).toHaveLength(4);
    });
  });

  describe('applySearchFilter', () => {
    it('searches in title field', () => {
      const result = applySearchFilter(mockBooks, 'hobbit', 'title');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('The Hobbit');
    });

    it('searches in author field', () => {
      const result = applySearchFilter(mockBooks, 'tolkien', 'author');
      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('Tolkien');
    });

    it('searches in title and author combined', () => {
      const result = applySearchFilter(mockBooks, 'asimov', 'title+author');
      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('Isaac Asimov');
    });

    it('searches in date field', () => {
      const result = applySearchFilter(mockBooks, '2020', 'date');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('The Hobbit');
    });

    it('searches in notes field', () => {
      const result = applySearchFilter(mockBooks, 'adventure', 'notes');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('The Hobbit');
    });

    it('searches across all fields with "anything"', () => {
      const result = applySearchFilter(mockBooks, 'orwell', 'anything');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('1984');
    });

    it('searches case-insensitively', () => {
      const result = applySearchFilter(mockBooks, 'FOUNDATION', 'title');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Foundation');
    });

    it('returns all books when query is empty', () => {
      const result = applySearchFilter(mockBooks, '', 'anything');
      expect(result).toHaveLength(4);
    });

    it('returns no books for non-matching query', () => {
      const result = applySearchFilter(mockBooks, 'nonexistent', 'title');
      expect(result).toHaveLength(0);
    });

    it('defaults to "anything" when field is unknown', () => {
      const result = applySearchFilter(mockBooks, 'tolkien', 'unknown');
      expect(result).toHaveLength(1);
      expect(result[0].author).toBe('Tolkien');
    });
  });

  describe('sortBooks - Date Sorting', () => {
    it('sorts by date ascending/descending and uses title as tiebreaker', () => {
      const result = sortBooks(mockBooks, 'date', false);
      expect(result[0].title).toBe('Foundation'); // non-numeric dates = 0
      expect(result[1].title).toBe('1984');
      expect(result[3].title).toBe('The Hobbit'); // latest date

      const descending = sortBooks(mockBooks, 'date', true);
      expect(descending[0].title).toBe('The Hobbit');
      expect(descending[3].title).toBe('Foundation');

      const sameDate = sortBooks(
        [
          { title: 'Z Book', date: '2020', dnf: false },
          { title: 'A Book', date: '2020', dnf: false },
        ],
        'date',
        false
      );
      expect(sameDate[0].title).toBe('A Book'); // tied dates sort by title
    });
  });

  describe('sortBooks - Numeric Sorting (Pages & Duration)', () => {
    it('sorts by pages ascending, treating null as 0', () => {
      const result = sortBooks(mockBooks, 'pages', false);
      expect(result[0].title).toBe('Foundation'); // 255
      expect(result[3].title).toBe('Dune'); // 682

      const booksWithoutPages = [
        { title: 'No Pages', meta: {}, dnf: false },
        { title: 'Has Pages', meta: { pages: 100 }, dnf: false },
      ];
      const noPageResult = sortBooks(booksWithoutPages, 'pages', false);
      expect(noPageResult[0].title).toBe('No Pages'); // null/undefined treated as 0
    });

    it('sorts by duration ascending', () => {
      const result = sortBooks(mockBooks, 'duration', false);
      // Only Dune has duration (720), others treated as 0
      expect(result[result.length - 1].title).toBe('Dune');
    });
  });

  describe('sortBooks - Generic Column Sorting', () => {
    it('sorts by title ascending', () => {
      const result = sortBooks(mockBooks, 'title', false);
      expect(result[0].title).toBe('1984');
      expect(result[1].title).toBe('Dune');
      expect(result[2].title).toBe('Foundation');
      expect(result[3].title).toBe('The Hobbit');
    });

    it('sorts by title descending', () => {
      const result = sortBooks(mockBooks, 'title', true);
      expect(result[0].title).toBe('The Hobbit');
      expect(result[3].title).toBe('1984');
    });

    it('sorts by author', () => {
      const result = sortBooks(mockBooks, 'author', false);
      expect(result[0].author).toBe('Frank Herbert');
      expect(result[1].author).toBe('George Orwell');
      expect(result[2].author).toBe('Isaac Asimov');
      expect(result[3].author).toBe('Tolkien');
    });

    it('sorts by DNF status', () => {
      const result = sortBooks(mockBooks, 'dnf', false);
      expect(result[0].dnf).toBe(false);
      expect(result[3].dnf).toBe(true);
    });

    it('is case-insensitive for string comparisons', () => {
      const result = sortBooks(mockBooks, 'author', false);
      expect(result[0].author).toBe('Frank Herbert');
    });

    it('handles diacritics correctly (accented chars sort naturally)', () => {
      const booksWithDiacritics = [
        { title: 'Édith', author: 'Author', dnf: false },
        { title: 'Éclat', author: 'Author', dnf: false },
        { title: 'Éd', author: 'Author', dnf: false },
        { title: 'Adamant', author: 'Author', dnf: false },
      ];
      const result = sortBooks(booksWithDiacritics, 'title', false);
      // Locale-aware sorting: é treated like e, so order is: Adamant, Éclat (é-c), Éd (é-d), Édith (é-d-i)
      expect(result[0].title).toBe('Adamant');
      expect(result[1].title).toBe('Éclat');
      expect(result[2].title).toBe('Éd');
      expect(result[3].title).toBe('Édith');
    });
  });

  describe('filterAndSort - Combined Operations', () => {
    it('applies all filters and sorts', () => {
      const result = filterAndSort(mockBooks, {
        dnfFilter: 'finished',
        audiobookFilter: 'paper',
        sortBy: 'title',
      });

      expect(result).toHaveLength(2); // The Hobbit, Foundation
      expect(result[0].title).toBe('Foundation');
      expect(result[1].title).toBe('The Hobbit');
    });

    it('searches and sorts', () => {
      const result = filterAndSort(mockBooks, {
        searchQuery: 'epic',
        searchField: 'notes',
        sortBy: 'title',
        sortDesc: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Dune');
    });

    it('filters DNF and searches by author', () => {
      const result = filterAndSort(mockBooks, {
        dnfFilter: 'dnf',
        searchQuery: 'orwell',
        searchField: 'author',
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('1984');
    });

    it('handles no filters (returns all in original order)', () => {
      const result = filterAndSort(mockBooks);

      expect(result).toHaveLength(4);
      expect(result).toEqual(mockBooks);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty books array', () => {
      const result = applyDnfFilter([], 'dnf');
      expect(result).toHaveLength(0);
    });

    it('handles missing metadata fields', () => {
      const book = { title: 'Test', dnf: false };
      const result = sortBooks([book], 'pages', false);
      expect(result).toHaveLength(1);
    });

    it('handles null/undefined values in search', () => {
      const book = { title: null, author: undefined, dnf: false };
      const result = applySearchFilter([book], 'test', 'title');
      expect(result).toHaveLength(0);
    });
  });
});
