import { normalizeTitle, booksToMap, buildBookMeta, serializeBooks } from './books';

describe('normalizeTitle', () => {
  it('lowercases title', () => {
    expect(normalizeTitle('THE HOBBIT')).toBe('the hobbit');
  });

  it('removes diacritics', () => {
    expect(normalizeTitle('À Tue Et À Toi')).toBe('a tue et a toi');
    expect(normalizeTitle('Café')).toBe('cafe');
    expect(normalizeTitle('Naïve')).toBe('naive');
  });

  it('replaces non-alphanumeric chars with spaces', () => {
    expect(normalizeTitle("Harry Potter: The Philosopher's Stone")).toBe('harry potter the philosopher s stone');
    expect(normalizeTitle('2001: A Space Odyssey')).toBe('2001 a space odyssey');
  });

  it('collapses multiple spaces into one', () => {
    expect(normalizeTitle('the   hobbit')).toBe('the hobbit');
    expect(normalizeTitle('title  with   multiple    spaces')).toBe('title with multiple spaces');
  });

  it('trims leading/trailing spaces', () => {
    expect(normalizeTitle('  the hobbit  ')).toBe('the hobbit');
  });

  it('handles mixed case and special characters', () => {
    expect(normalizeTitle('ThE LoRd Of ThE RiNgS!!!')).toBe('the lord of the rings');
  });

  it('preserves numbers', () => {
    expect(normalizeTitle('1984')).toBe('1984');
    expect(normalizeTitle('The 39 Steps')).toBe('the 39 steps');
  });

  it('handles empty string', () => {
    expect(normalizeTitle('')).toBe('');
  });

  it('handles title with only spaces', () => {
    expect(normalizeTitle('   ')).toBe('');
  });

  it('handles complex unicode', () => {
    expect(normalizeTitle('José García')).toBe('jose garcia');
    expect(normalizeTitle('Napoléon Bonaparte')).toBe('napoleon bonaparte');
  });

  it('handles apostrophes and quotes', () => {
    expect(normalizeTitle("Don't Stop Believin'")).toBe('don t stop believin');
    expect(normalizeTitle('"Quoted Title"')).toBe('quoted title');
  });

  it('handles hyphens and dashes', () => {
    expect(normalizeTitle('Life-Changing Moment')).toBe('life changing moment');
    expect(normalizeTitle('Twenty—En Dashes')).toBe('twenty en dashes');
  });
});

describe('booksToMap', () => {
  it('converts array to map with _key as key', () => {
    const books = [
      { _key: 'the-hobbit', title: 'The Hobbit', author: 'Tolkien' },
      { _key: 'lotr', title: 'Lord of the Rings', author: 'Tolkien' },
    ];

    const result = booksToMap(books);

    expect(result['the-hobbit']).toEqual({ _key: 'the-hobbit', title: 'The Hobbit', author: 'Tolkien' });
    expect(result['lotr']).toEqual({ _key: 'lotr', title: 'Lord of the Rings', author: 'Tolkien' });
  });

  it('handles empty array', () => {
    const result = booksToMap([]);
    expect(result).toEqual({});
  });

  it('handles single book', () => {
    const books = [{ _key: 'test', title: 'Test Book', author: 'Author' }];
    const result = booksToMap(books);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result['test']).toBeDefined();
  });

  it('spreads all properties from original book', () => {
    const books = [
      {
        _key: 'the-hobbit',
        title: 'The Hobbit',
        author: 'Tolkien',
        date: '2020',
        dnf: false,
        notes: 'Great book',
        meta: { pages: 310 },
      },
    ];

    const result = booksToMap(books);
    const book = result['the-hobbit'];

    expect(book._key).toBe('the-hobbit');
    expect(book.title).toBe('The Hobbit');
    expect(book.author).toBe('Tolkien');
    expect(book.date).toBe('2020');
    expect(book.dnf).toBe(false);
    expect(book.notes).toBe('Great book');
    expect(book.meta).toEqual({ pages: 310 });
  });

  it('creates independent copies (spread operator)', () => {
    const books = [{ _key: 'test', title: 'Original' }];
    const result = booksToMap(books);

    result['test'].title = 'Modified';

    expect(books[0].title).toBe('Original');
  });
});

describe('buildBookMeta', () => {
  it('includes all fields when provided', () => {
    const meta = {
      pages: 310,
      duration: 450,
      GoodreadsID: '12345',
      ISBN: '978-0-123456-78-9',
      pubDate: '2020-01-01',
    };

    const result = buildBookMeta(meta);

    expect(result).toEqual({
      pages: 310,
      duration: 450,
      GoodreadsID: '12345',
      ISBN: '978-0-123456-78-9',
      pubDate: '2020-01-01',
    });
  });

  it('converts falsy pages/ISBN/GoodreadsID/pubDate to null', () => {
    const meta = {
      pages: 0,
      duration: 500,
      GoodreadsID: '',
      ISBN: null,
      pubDate: false,
    };

    const result = buildBookMeta(meta);

    expect(result.pages).toBeNull();
    expect(result.duration).toBe(500);
    expect(result.GoodreadsID).toBeNull();
    expect(result.ISBN).toBeNull();
    expect(result.pubDate).toBeNull();
  });

  it('keeps duration as-is (undefined or number)', () => {
    expect(buildBookMeta({ duration: 500 }).duration).toBe(500);
    expect(buildBookMeta({ pages: 100 }).duration).toBeUndefined();
  });

  it('ignores extra fields not in schema', () => {
    const result = buildBookMeta({
      pages: 310,
      extraField: 'ignored',
      anotherExtra: 123,
    });

    expect(result.extraField).toBeUndefined();
    expect(result.anotherExtra).toBeUndefined();
    expect(result.pages).toBe(310);
  });
});

describe('serializeBooks', () => {
  it('serializes only approved fields', () => {
    const booksData = {
      'the-hobbit': {
        _key: 'the-hobbit', // Internal, exclude
        title: 'The Hobbit',
        author: 'Tolkien',
        date: '2020',
        dnf: false,
        notes: 'Great adventure',
        meta: { pages: 310 },
        internalVueTracking: 'excluded', // Internal, exclude
        accidentalMutation: 'excluded', // Internal, exclude
      },
    };

    const result = serializeBooks(booksData);
    const book = result['the-hobbit'];

    expect(book._key).toBeUndefined();
    expect(book.internalVueTracking).toBeUndefined();
    expect(book.accidentalMutation).toBeUndefined();
    expect(book.title).toBe('The Hobbit');
    expect(book.author).toBe('Tolkien');
    expect(book.date).toBe('2020');
    expect(book.dnf).toBe(false);
    expect(book.notes).toBe('Great adventure');
    expect(book.meta.pages).toBe(310);
  });

  it('excludes metadata when not present', () => {
    const booksData = {
      'simple-book': {
        title: 'Simple Book',
        author: 'Author',
        date: '2021',
        dnf: false,
        notes: 'No metadata',
      },
    };

    const result = serializeBooks(booksData);
    expect(result['simple-book'].meta).toBeUndefined();
  });

  it('includes metadata when present', () => {
    const booksData = {
      'with-meta': {
        title: 'With Meta',
        author: 'Author',
        date: '2021',
        dnf: false,
        notes: '',
        meta: { ISBN: '123-456', pages: 500 },
      },
    };

    const result = serializeBooks(booksData);
    expect(result['with-meta'].meta).toBeDefined();
    expect(result['with-meta'].meta.ISBN).toBe('123-456');
    expect(result['with-meta'].meta.pages).toBe(500);
  });

  it('handles multiple books with mixed metadata', () => {
    const booksData = {
      book1: {
        title: 'Book 1',
        author: 'Author 1',
        date: '2020',
        dnf: false,
        notes: 'Notes',
        meta: { pages: 100 },
        _key: 'book1', // Internal
      },
      book2: {
        title: 'Book 2',
        author: 'Author 2',
        date: '2021',
        dnf: true,
        notes: 'More notes',
        _key: 'book2', // Internal
      },
    };

    const result = serializeBooks(booksData);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result.book1.title).toBe('Book 1');
    expect(result.book1.meta.pages).toBe(100);
    expect(result.book2.title).toBe('Book 2');
    expect(result.book2.meta).toBeUndefined();
  });

  it('handles empty metadata object', () => {
    const booksData = {
      book: {
        title: 'Book',
        author: 'Author',
        date: '2021',
        dnf: false,
        notes: '',
        meta: {}, // Empty object
      },
    };

    const result = serializeBooks(booksData);
    expect(result.book.meta).toBeUndefined(); // Falsy, so excluded
  });

  it('handles null metadata', () => {
    const booksData = {
      book: {
        title: 'Book',
        author: 'Author',
        date: '2021',
        dnf: false,
        notes: '',
        meta: null,
      },
    };

    const result = serializeBooks(booksData);
    expect(result.book.meta).toBeUndefined();
  });

  it('creates independent serialized copies', () => {
    const booksData = {
      original: {
        title: 'Original',
        author: 'Author',
        date: '2021',
        dnf: false,
        notes: 'Note',
      },
    };

    const result = serializeBooks(booksData);
    result.original.title = 'Modified';

    expect(booksData.original.title).toBe('Original'); // Unchanged
  });

  it('preserves all approved field values exactly', () => {
    const booksData = {
      test: {
        title: 'Title with Spaces!',
        author: 'Author, Name',
        date: '2021-12-25',
        dnf: true,
        notes: 'Multi-line\nnotes\nhere',
        meta: { pages: 999, duration: 720, ISBN: 'ABC-123' },
      },
    };

    const result = serializeBooks(booksData);
    const book = result.test;

    expect(book.title).toBe('Title with Spaces!');
    expect(book.author).toBe('Author, Name');
    expect(book.date).toBe('2021-12-25');
    expect(book.dnf).toBe(true);
    expect(book.notes).toBe('Multi-line\nnotes\nhere');
    expect(book.meta.pages).toBe(999);
    expect(book.meta.duration).toBe(720);
    expect(book.meta.ISBN).toBe('ABC-123');
  });
});
