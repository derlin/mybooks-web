// @ts-nocheck

import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Book } from '../types';
import { BooksProvider } from './booksProvider';
import type { IDropboxService } from './dropboxService';

describe('BooksProvider', () => {
  let mockDropboxService: Mocked<IDropboxService>;
  let booksProvider: BooksProvider;

  beforeEach(() => {
    mockDropboxService = {
      downloadFile: vi.fn(),
      uploadFile: vi.fn(),
      getRevision: vi.fn(),
      tryLogin: vi.fn(),
      logout: vi.fn(),
      getAuthUrl: vi.fn(),
      exchangeCodeForToken: vi.fn(),
    };
    booksProvider = new BooksProvider(mockDropboxService);
  });

  describe('serializeBooks (via uploadBooks)', () => {
    it('converts list to map with _key as map key and removes _key from value', async () => {
      const books: Book[] = [
        {
          title: 'The Hobbit',
          author: 'Tolkien',
          date: '2023-01',
          dnf: false,
          notes: '',
          _key: 'the hobbit',
        },
        {
          title: 'Another Book',
          author: 'Another Author',
          date: '2023',
          dnf: true,
          notes: 'test notes',
          _key: 'another book',
        },
      ];

      mockDropboxService.uploadFile.mockResolvedValueOnce({ rev: 'rev123' });

      await booksProvider.uploadBooks(books);

      const uploadedBlob = mockDropboxService.uploadFile.mock.calls[0][1];
      const content = await uploadedBlob.text();
      const serialized = JSON.parse(content);

      expect(serialized).toEqual({
        'another book': {
          title: 'Another Book',
          author: 'Another Author',
          date: '2023',
          dnf: true,
          notes: 'test notes',
        },
        'the hobbit': {
          title: 'The Hobbit',
          author: 'Tolkien',
          date: '2023-01',
          dnf: false,
          notes: '',
        },
      });
    });

    describe('meta field serialization', () => {
      it.each([
        {
          description: 'undefined meta',
          meta: undefined,
          shouldSerialize: false,
        },
        {
          description: 'empty meta object',
          meta: {},
          shouldSerialize: false,
        },
        {
          description: 'meta with all null values',
          meta: { GoodreadsID: null, ISBN: null, pubDate: null, pages: null },
          shouldSerialize: false,
        },
        {
          description: 'meta with all undefined values',
          meta: { GoodreadsID: undefined, ISBN: undefined },
          shouldSerialize: false,
        },
        {
          description: 'meta with mixed null and undefined',
          meta: { GoodreadsID: null, ISBN: undefined, pubDate: null },
          shouldSerialize: false,
        },
        {
          description: 'meta with one valid value among nulls',
          meta: { GoodreadsID: '12345', ISBN: null, pubDate: null },
          shouldSerialize: true,
          expectedMeta: { GoodreadsID: '12345' },
        },
        {
          description: 'meta with multiple valid values',
          meta: { pages: 300, duration: 600, ISBN: null },
          shouldSerialize: true,
          expectedMeta: { pages: 300, duration: 600 },
        },
      ])('$description: serializes=$shouldSerialize', async ({ meta, shouldSerialize, expectedMeta }) => {
        const books: Book[] = [
          {
            title: 'Test Book',
            author: 'Author',
            date: '2023',
            dnf: false,
            notes: '',
            ...(meta !== undefined && { meta }),
            _key: 'test book',
          },
        ];

        mockDropboxService.uploadFile.mockResolvedValueOnce({ rev: 'rev123' });

        await booksProvider.uploadBooks(books);

        const uploadedBlob = mockDropboxService.uploadFile.mock.calls[0][1];
        const content = await uploadedBlob.text();
        const serialized = JSON.parse(content);

        if (shouldSerialize) {
          expect(serialized['test book']).toHaveProperty('meta');
          expect(serialized['test book'].meta).toEqual(expectedMeta);
        } else {
          expect(serialized['test book']).not.toHaveProperty('meta');
        }
      });
    });

    it('always sets synced revision after successful upload', async () => {
      const testCases = [{ rev: 'rev-abc-123' }, { rev: 'single-book-rev' }, { rev: 'multi-book-rev' }];

      for (const { rev } of testCases) {
        const books: Book[] = [
          {
            title: 'Test Book',
            author: 'Author',
            date: '2023',
            dnf: false,
            notes: '',
            _key: 'test book',
          },
        ];

        mockDropboxService.uploadFile.mockResolvedValueOnce({ rev });
        await booksProvider.uploadBooks(books);

        const syncedRev = (booksProvider as any).getSyncedRevision();
        expect(syncedRev).toBe(rev);
      }
    });
  });

  describe('checkFileRevision', () => {
    it('propagates errors', async () => {
      const error = new Error('Some error');
      (booksProvider as any).setSyncedRevision('rev-123');
      mockDropboxService.getRevision.mockRejectedValueOnce(error);

      await expect(booksProvider.checkFileRevision()).rejects.toThrow(error);
    });

    it('returns true when revision changed', async () => {
      // No current revision (should not happen)
      mockDropboxService.getRevision.mockResolvedValueOnce({ rev: 'rev-initial' });
      expect(await booksProvider.checkFileRevision()).toBe(true);

      // We have a local state
      (booksProvider as any).setSyncedRevision('rev-initial');

      // No change
      mockDropboxService.getRevision.mockResolvedValueOnce({ rev: 'rev-initial' });
      expect(await booksProvider.checkFileRevision()).toBe(false);

      mockDropboxService.getRevision.mockResolvedValueOnce({ rev: 'rev-initial' });
      expect(await booksProvider.checkFileRevision()).toBe(false);

      // New revision
      mockDropboxService.getRevision.mockResolvedValueOnce({ rev: 'rev-different' });
      expect(await booksProvider.checkFileRevision()).toBe(true);
    });
  });
});
