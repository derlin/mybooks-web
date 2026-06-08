// @ts-nocheck
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { __test__, fetchBookMetadata } from './goodreads';

const { validateUrl, fetchPageContent, extractJsonLd } = __test__;

// Save the real fetch before any mocking
const realFetch = global.fetch;

describe('Goodreads Service', () => {
  describe('validateUrl', () => {
    test.each([
      ['https://www.goodreads.com/book/show/24885533-the-paper-menagerie-and-other-stories', true],
      ['https://www.goodreads.com/en/book/show/27208.The_Third_Policeman', true],
      ['https://example.com/book/show/123', false],
      ['https://www.goodreads.com/author/show/123', false],
      ['not a url', false],
      ['', false],
    ])('validates URL %s -> %s', (url, expected) => {
      expect(validateUrl(url)).toBe(expected);
    });
  });

  describe('fetchPageContent', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('fetches and returns HTML content', async () => {
      const mockHtml = '<html><body>Test</body></html>';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      });

      const result = await fetchPageContent('https://www.goodreads.com/book/show/123-test');

      expect(result).toBe(mockHtml);
    });

    test('throws error on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchPageContent('https://www.goodreads.com/book/show/123-test')).rejects.toThrow(
        'Failed to fetch Goodreads page'
      );
    });

    test('throws error on non-OK response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(fetchPageContent('https://www.goodreads.com/book/show/999-nonexistent')).rejects.toThrow(
        'Failed to fetch page: 404 Not Found'
      );
    });

    test('throws error when text reading fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => {
          throw new Error('Read error');
        },
      });

      await expect(fetchPageContent('https://www.goodreads.com/book/show/123-test')).rejects.toThrow(
        'Failed to read page content'
      );
    });
  });

  describe('extractJsonLd', () => {
    test('extracts valid JSON-LD from HTML', () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">{"@context":"https://schema.org","@type":"Book","name":"Test Book","author":{"@type":"Person","name":"Test Author"}}</script>
          </head>
        </html>
      `;

      const result = extractJsonLd(mockHtml);

      expect(result.name).toBe('Test Book');
      expect(result.author.name).toBe('Test Author');
    });

    test('throws error when JSON-LD block is missing', () => {
      const mockHtml = '<html><head><title>No JSON-LD</title></head></html>';

      expect(() => extractJsonLd(mockHtml)).toThrow('No book metadata found on this page');
    });

    test('throws error on invalid JSON', () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">{"invalid json"}</script>
          </head>
        </html>
      `;

      expect(() => extractJsonLd(mockHtml)).toThrow('Failed to parse book metadata from the page');
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

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('rejects invalid URL', async () => {
      await expect(fetchBookMetadata('https://example.com')).rejects.toThrow('Invalid Goodreads URL');
    });

    test('rejects URL without Goodreads ID', async () => {
      await expect(fetchBookMetadata('https://www.goodreads.com/author/show/123')).rejects.toThrow(
        'Invalid Goodreads URL'
      );
    });

    test('extracts Goodreads ID from URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlWithValidJsonLd,
      });
      const metadata = await fetchBookMetadata('https://www.goodreads.com/book/show/24885533-the-paper-menagerie');
      expect(metadata.goodreadsId).toBe('24885533');
    });

    test('successfully fetches and parses metadata', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlWithValidJsonLd,
      });
      const metadata = await fetchBookMetadata('https://www.goodreads.com/book/show/123-test-book');
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
      const mockMultipleAuthors = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">{"@context":"https://schema.org","@type":"Book","name":"Multi Author Book","author":[{"@type":"Person","name":"Author One"},{"@type":"Person","name":"Author Two"}],"isbn":"0987654321","numberOfPages":250}</script>
          </head>
          <body>Test</body>
        </html>
      `;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockMultipleAuthors,
      });
      const metadata = await fetchBookMetadata('https://www.goodreads.com/book/show/456-multi-author');
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
      const metadata = await fetchBookMetadata('https://www.goodreads.com/book/show/123-test');
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
      const metadata = await fetchBookMetadata('https://www.goodreads.com/book/show/789-test');
      expect(metadata.pages).toBeNull();
    });

    test('handles missing ISBN', async () => {
      const mockHtmlNoIsbn = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">{"@context":"https://schema.org","@type":"Book","name":"Test Book","author":{"@type":"Person","name":"Test Author"},"numberOfPages":250}</script>
          </head>
          <body>Test</body>
        </html>
      `;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlNoIsbn,
      });

      const metadata = await fetchBookMetadata('https://www.goodreads.com/book/show/789-test');

      expect(metadata.title).toBe('Test Book');
      expect(metadata.author).toBe('Test Author');
      expect(metadata.isbn).toBeUndefined();
      expect(metadata.pages).toBe(250);
    });

    test('throws error when required fields are missing', async () => {
      const mockHtmlMissingRequiredFields = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="application/ld+json">{"@context":"https://schema.org","@type":"Book","name":"Incomplete Book"}</script>
          </head>
          <body>Test</body>
        </html>
      `;
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlMissingRequiredFields,
      });

      await expect(fetchBookMetadata('https://www.goodreads.com/book/show/123-incomplete')).rejects.toThrow(
        'Missing required metadata'
      );
    });

    test('handles HTML entities in author name', async () => {
      const htmlWithEntities = mockHtmlWithValidJsonLd.replace('Test Author', 'O&apos;Brien');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => htmlWithEntities,
      });
      const metadata = await fetchBookMetadata('https://www.goodreads.com/book/show/123-test');
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
        expect.stringContaining('proxy?'),
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
      expect(callArgs[1].headers.Referer).toBe('https://www.goodreads.com/');
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
    const url = 'https://www.goodreads.com/en/book/show/27208.The_Third_Policeman';
    const metadata = await fetchBookMetadata(url);

    expect(metadata.title).toBe('The Third Policeman');
    expect(metadata.author).toContain('Flann');
    expect(metadata.goodreadsId).toBe('27208');
    expect(typeof metadata.pages).toBe('number');
    expect(metadata.pages).toBeGreaterThan(0);
    // ISBN may or may not be available (optional)
    expect(metadata.isbn === undefined || typeof metadata.isbn === 'string').toBe(true);
    // pubDate may or may not be available
    expect(metadata.pubDate === null || typeof metadata.pubDate === 'string').toBe(true);
  }, 30000);
});
