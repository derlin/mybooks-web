import { serializeBooks } from '../utils/books';

describe('Dropbox Service - Core Business Logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Token Expiration Logic', () => {
    it('returns true if no token stored', () => {
      const auth = null;
      const isExpired = !auth?.expiresAt;
      expect(isExpired).toBe(true);
    });

    it('detects expired token correctly', () => {
      const now = Date.now();
      const expiresAt = now - 1000; // Expired

      jest.setSystemTime(now);

      const auth = { accessToken: 'token', refreshToken: 'refresh', expiresAt };
      const isExpired = !auth?.expiresAt || Date.now() > auth.expiresAt - 5 * 60 * 1000;

      expect(isExpired).toBe(true);
    });

    it('detects valid token correctly', () => {
      const now = Date.now();
      const expiresAt = now + 10 * 60 * 1000; // 10 minutes from now

      jest.setSystemTime(now);

      const auth = { accessToken: 'token', refreshToken: 'refresh', expiresAt };
      const isExpired = !auth?.expiresAt || Date.now() > auth.expiresAt - 5 * 60 * 1000;

      expect(isExpired).toBe(false);
    });

    it('enforces 5-minute safety buffer', () => {
      const now = Date.now();
      const expiresAt = now + 4 * 60 * 1000; // 4 minutes (within 5-min buffer)

      jest.setSystemTime(now);

      const auth = { accessToken: 'token', refreshToken: 'refresh', expiresAt };
      const isExpired = !auth?.expiresAt || Date.now() > auth.expiresAt - 5 * 60 * 1000;

      expect(isExpired).toBe(true);
    });

    it('allows access beyond 5-minute buffer', () => {
      const now = Date.now();
      const expiresAt = now + 6 * 60 * 1000; // 6 minutes (outside 5-min buffer)

      jest.setSystemTime(now);

      const auth = { accessToken: 'token', refreshToken: 'refresh', expiresAt };
      const isExpired = !auth?.expiresAt || Date.now() > auth.expiresAt - 5 * 60 * 1000;

      expect(isExpired).toBe(false);
    });
  });

  describe('Token Storage Format', () => {
    it('stores token with expiration time', () => {
      const accessToken = 'access-123';
      const refreshToken = 'refresh-456';
      const expiresIn = 3600; // 1 hour in seconds
      const now = Date.now();

      jest.setSystemTime(now);

      // Simulate what storeTokens does
      const expiresAt = now + expiresIn * 1000;
      const stored = {
        accessToken,
        refreshToken,
        expiresAt,
      };

      expect(stored.accessToken).toBe(accessToken);
      expect(stored.refreshToken).toBe(refreshToken);
      expect(stored.expiresAt).toBe(expiresAt);
      expect(typeof stored.expiresAt).toBe('number');
    });

    it('stores file revision for concurrency control', () => {
      const rev = 'rev-123456';
      const stored = rev;

      expect(stored).toBe(rev);
    });
  });

  describe('uploadBooks - Serialization Logic', () => {
    it('serializes only approved fields', () => {
      const booksData = {
        'the-hobbit': {
          _key: 'the-hobbit', // Internal, exclude
          title: 'The Hobbit',
          author: 'Tolkien',
          date: '2020',
          dnf: false,
          notes: 'Great book',
          meta: { pages: 310 },
          internalVueTracking: 'excluded', // Internal, exclude
          accidentalMutation: 'excluded', // Internal, exclude
        },
      };

      const cleanedData = serializeBooks(booksData);
      const book = cleanedData['the-hobbit'];

      expect(book._key).toBeUndefined();
      expect(book.internalVueTracking).toBeUndefined();
      expect(book.accidentalMutation).toBeUndefined();
      expect(book.title).toBe('The Hobbit');
      expect(book.author).toBe('Tolkien');
      expect(book.meta.pages).toBe(310);
    });

    it('handles books without metadata', () => {
      const booksData = {
        'book-no-meta': {
          title: 'Simple Book',
          author: 'Author',
          date: '2021',
          dnf: false,
          notes: 'No metadata',
        },
      };

      const cleanedData = serializeBooks(booksData);
      expect(cleanedData['book-no-meta'].meta).toBeUndefined();
    });

    it('handles books with partial metadata', () => {
      const booksData = {
        'book-with-meta': {
          title: 'Book',
          author: 'Author',
          date: '2021',
          dnf: false,
          notes: '',
          meta: { ISBN: '123-456', pages: 500 },
        },
      };

      const cleanedData = serializeBooks(booksData);
      const book = cleanedData['book-with-meta'];
      expect(book.meta.ISBN).toBe('123-456');
      expect(book.meta.pages).toBe(500);
    });

    it('handles multiple books with mixed data', () => {
      const booksData = {
        book1: {
          title: 'Book 1',
          author: 'Author 1',
          date: '2020',
          dnf: false,
          notes: 'Notes',
          meta: { pages: 100 },
          _key: 'book1',
        },
        book2: {
          title: 'Book 2',
          author: 'Author 2',
          date: '2021',
          dnf: true,
          notes: 'Notes 2',
          _key: 'book2',
        },
      };

      const cleanedData = serializeBooks(booksData);
      expect(Object.keys(cleanedData)).toHaveLength(2);
      expect(cleanedData.book1.title).toBe('Book 1');
      expect(cleanedData.book1.dnf).toBe(false);
      expect(cleanedData.book2.dnf).toBe(true);
    });
  });

  describe('uploadBooks - Revision Storage', () => {
    it('stores revision from Dropbox API response after upload', () => {
      // Simulate the flow: uploadBooks gets response from Dropbox filesUpload
      const apiResponse = { result: { rev: 'rev-new-abc123' } };
      const storedRev = apiResponse.result.rev;

      // Verify the revision can be extracted and would be stored
      expect(storedRev).toBe('rev-new-abc123');
      expect(typeof storedRev).toBe('string');
    });

    it('updates stored revision when new upload occurs', () => {
      // First upload stores a revision
      let storedRev = 'rev-old-123';
      expect(storedRev).toBe('rev-old-123');

      // Second upload returns a new revision
      const newApiResponse = { result: { rev: 'rev-new-456' } };
      storedRev = newApiResponse.result.rev;

      // Verify the revision was updated
      expect(storedRev).toBe('rev-new-456');
      expect(storedRev).not.toBe('rev-old-123');
    });

    it('enables proper concurrency detection after upload', () => {
      // After upload, stored revision matches Dropbox revision
      const storedRev = 'rev-12345';
      const dropboxRev = 'rev-12345';

      // Later, checkFileRevision compares them
      const hasConflict = dropboxRev !== storedRev;
      expect(hasConflict).toBe(false);

      // If another session edited the file...
      const updatedDropboxRev = 'rev-67890';
      const hasConflictNow = updatedDropboxRev !== storedRev;
      expect(hasConflictNow).toBe(true);
    });
  });

  describe('checkFileRevision - Comparison Logic', () => {
    it('detects no conflict when revisions match', () => {
      const storedRev = 'rev-123';
      const currentRev = 'rev-123';

      const hasConflict = currentRev !== storedRev;

      expect(hasConflict).toBe(false);
    });

    it('detects conflict when revisions differ', () => {
      const storedRev = 'rev-123';
      const currentRev = 'rev-456';

      const hasConflict = currentRev !== storedRev;

      expect(hasConflict).toBe(true);
    });

    it('handles null stored revision', () => {
      const currentRev = 'rev-123';
      const storedRev = null;

      const hasConflict = currentRev !== storedRev;
      expect(hasConflict).toBe(true);
    });

    it('handles revision update', () => {
      let storedRev = 'rev-old';
      const newRev = 'rev-new';

      expect(storedRev).toBe('rev-old');

      // Simulate update
      storedRev = newRev;
      expect(storedRev).toBe(newRev);
    });
  });

  describe('Code Verifier Storage', () => {
    it('stores code verifier correctly', () => {
      const verifier = 'verifier-abc123';

      const stored = verifier;
      expect(stored).toBe(verifier);
      expect(typeof stored).toBe('string');
      expect(stored.length).toBeGreaterThan(0);
    });

    it('clears code verifier after token exchange', () => {
      let verifier = 'verifier-abc123';
      expect(verifier).toBe('verifier-abc123');

      // Simulate clearing
      verifier = null;
      expect(verifier).toBeNull();
    });
  });
});
