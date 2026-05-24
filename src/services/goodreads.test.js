import { validateUrl, fetchBookMetadata } from './goodreads.js';

// Save the real fetch before any mocking
const realFetch = global.fetch;

describe('Goodreads Service', () => {
  describe('validateUrl', () => {
    test('validates correct Goodreads URL with /book/show/', () => {
      const url =
        'https://www.goodreads.com/book/show/24885533-the-paper-menagerie-and-other-stories';
      expect(validateUrl(url)).toBe(true);
    });

    test('validates Goodreads URL with /en/book/show/', () => {
      const url =
        'https://www.goodreads.com/en/book/show/27208.The_Third_Policeman';
      expect(validateUrl(url)).toBe(true);
    });

    test('rejects non-Goodreads URL', () => {
      const url = 'https://example.com/book/show/123';
      expect(validateUrl(url)).toBe(false);
    });

    test('rejects URL without /book/show/', () => {
      const url = 'https://www.goodreads.com/author/show/123';
      expect(validateUrl(url)).toBe(false);
    });

    test('rejects malformed URL', () => {
      const url = 'not a url';
      expect(validateUrl(url)).toBe(false);
    });

    test('rejects empty string', () => {
      const url = '';
      expect(validateUrl(url)).toBe(false);
    });
  });

  describe('fetchBookMetadata', () => {
    const mockHtmlWithValidJsonLd = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"Book","name":"Test Book","author":{"@type":"Person","name":"Test Author"},"isbn":"1234567890","numberOfPages":300}</script>
        </head>
        <body>Test</body>
      </html>
    `;

    const mockHtmlWithMultipleAuthors = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"Book","name":"Multi Author Book","author":[{"@type":"Person","name":"Author One"},{"@type":"Person","name":"Author Two"}],"isbn":"0987654321","numberOfPages":250}</script>
        </head>
        <body>Test</body>
      </html>
    `;

    const mockHtmlWithoutJsonLd = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Book</title>
        </head>
        <body>Test</body>
      </html>
    `;

    const mockHtmlMissingFields = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"Book","name":"Incomplete Book"}</script>
        </head>
        <body>Test</body>
      </html>
    `;

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('rejects invalid URL', async () => {
      await expect(fetchBookMetadata('https://example.com')).rejects.toThrow(
        'Invalid Goodreads URL'
      );
    });

    test('rejects URL without Goodreads ID', async () => {
      await expect(
        fetchBookMetadata('https://www.goodreads.com/author/show/123')
      ).rejects.toThrow('Invalid Goodreads URL');
    });

    test('extracts Goodreads ID from URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlWithValidJsonLd,
      });

      const metadata = await fetchBookMetadata(
        'https://www.goodreads.com/book/show/24885533-the-paper-menagerie'
      );

      expect(metadata.goodreadsId).toBe('24885533');
    });

    test('successfully fetches and parses metadata', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlWithValidJsonLd,
      });

      const metadata = await fetchBookMetadata(
        'https://www.goodreads.com/book/show/123-test-book'
      );

      expect(metadata).toEqual({
        title: 'Test Book',
        author: 'Test Author',
        isbn: '1234567890',
        pages: 300,
        goodreadsId: '123',
        pubDate: null,
      });
    });

    test('handles multiple authors by taking the first', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlWithMultipleAuthors,
      });

      const metadata = await fetchBookMetadata(
        'https://www.goodreads.com/book/show/456-multi-author'
      );

      expect(metadata.author).toBe('Author One');
    });

    test('extracts publication date from HTML', async () => {
      const mockHtmlWithPubDate = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">{"@context":"https://schema.org","@type":"Book","name":"Test Book","author":{"@type":"Person","name":"Test Author"},"isbn":"1234567890"}</script>
          </head>
          <body>First published: March 8, 2016</body>
        </html>
      `;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlWithPubDate,
      });

      const metadata = await fetchBookMetadata(
        'https://www.goodreads.com/book/show/123-test'
      );

      expect(metadata.pubDate).toBe('2016-03-08');
    });

    test('handles missing page count', async () => {
      const mockHtmlNoPages = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">{"@context":"https://schema.org","@type":"Book","name":"Test Book","author":{"@type":"Person","name":"Test Author"},"isbn":"1234567890"}</script>
          </head>
          <body>Test</body>
        </html>
      `;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlNoPages,
      });

      const metadata = await fetchBookMetadata(
        'https://www.goodreads.com/book/show/789-test'
      );

      expect(metadata.pages).toBeNull();
    });

    test('throws error when fetch fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        fetchBookMetadata('https://www.goodreads.com/book/show/123-test')
      ).rejects.toThrow('Failed to fetch Goodreads page');
    });

    test('throws error when page returns non-OK status', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        fetchBookMetadata('https://www.goodreads.com/book/show/999-nonexistent')
      ).rejects.toThrow('Failed to fetch page: 404 Not Found');
    });

    test('throws error when JSON-LD block is missing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlWithoutJsonLd,
      });

      await expect(
        fetchBookMetadata('https://www.goodreads.com/book/show/123-test')
      ).rejects.toThrow('No book metadata found on this page');
    });

    test('throws error when required fields are missing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlMissingFields,
      });

      await expect(
        fetchBookMetadata('https://www.goodreads.com/book/show/123-incomplete')
      ).rejects.toThrow('Missing required metadata');
    });

    test('throws error when text reading fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => {
          throw new Error('Read error');
        },
      });

      await expect(
        fetchBookMetadata('https://www.goodreads.com/book/show/123-test')
      ).rejects.toThrow('Failed to read page content');
    });

    test('handles HTML entities in author name', async () => {
      const htmlWithEntities = mockHtmlWithValidJsonLd.replace(
        'Test Author',
        'O&apos;Brien'
      );
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => htmlWithEntities,
      });

      const metadata = await fetchBookMetadata(
        'https://www.goodreads.com/book/show/123-test'
      );

      expect(metadata.author).toBe("O'Brien");
    });

    test('uses CORS proxy URL correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlWithValidJsonLd,
      });

      const testUrl = 'https://www.goodreads.com/book/show/123-test-book';
      await fetchBookMetadata(testUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.codetabs.com/v1/proxy?quest='),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
    });

    test('includes browser headers in fetch request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlWithValidJsonLd,
      });

      await fetchBookMetadata('https://www.goodreads.com/book/show/123-test');

      const callArgs = global.fetch.mock.calls[0];
      expect(callArgs[1].headers['User-Agent']).toContain('Mozilla');
      expect(callArgs[1].headers['Referer']).toBe('https://www.goodreads.com/');
    });
  });
});

// Real integration test with actual Goodreads page (unmocked)
describe('Goodreads Service - Real Page Fetch', () => {
  beforeAll(() => {
    // Restore real fetch for integration test
    global.fetch = realFetch;
  });

  test('fetches metadata from a real Goodreads page', async () => {
    const url =
      'https://www.goodreads.com/en/book/show/27208.The_Third_Policeman';
    const metadata = await fetchBookMetadata(url);

    expect(metadata.title).toBe('The Third Policeman');
    expect(metadata.author).toContain('Flann');
    expect(metadata.goodreadsId).toBe('27208');
    expect(typeof metadata.pages).toBe('number');
    expect(metadata.pages).toBeGreaterThan(0);
    expect(metadata.isbn).toBeTruthy();
    // pubDate may or may not be available
    expect(
      metadata.pubDate === null || typeof metadata.pubDate === 'string'
    ).toBe(true);
  }, 30000);
});
