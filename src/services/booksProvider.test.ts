// @ts-nocheck

import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Book } from '../types';
import { __TEST__, BooksProvider } from './booksProvider';
import type { IDropboxService } from './dropboxService';

describe('removeEmpty', () => {
  it('removes null and undefined values from objects', () => {
    const input = {
      name: 'Alice',
      age: 30,
      middleName: null,
      nickname: undefined,
      tags: [],
      other_tags: [1],
      metadata: {
        created: null,
        nestedEmpty: {
          a: null,
          b: [],
        },
      },
      posts: [
        { title: 'First Post', tags: [] },
        { title: null, tags: [] }, // becomes empty object -> stripped from array
      ],
    };

    const result = __TEST__.removeEmpty(input);
    expect(result).toEqual({
      name: 'Alice',
      age: 30,
      other_tags: [1],
      posts: [{ title: 'First Post' }],
    });
  });
});

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
