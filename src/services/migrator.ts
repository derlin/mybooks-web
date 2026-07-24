import type { BooksFile } from '@/types';

interface MigrationInteface {
  shouldApply: (data: any) => boolean;
  apply: (data: any) => any;
}

const isDict = (data: any): boolean => {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
};

const getVersion = (data: any) => {
  if (isDict(data) && 'version' in data && typeof data.version === 'number') {
    return data.version;
  }
  return null;
};

const MigratorV0_V1: MigrationInteface = {
  shouldApply: (data: any): boolean => {
    return typeof data === 'object' && !getVersion(data);
  },

  apply: (data: any): any => {
    const books = Object.entries(data).map(([_key, value]) => {
      const book = value as any;
      return {
        title: book.title,
        author: book.author,
        date_published: book.meta?.pubDate,
        isbn: book.meta?.ISBN,
        pages: book.meta?.pages,
        duration: book.meta?.duration,
        date_read: book.date,
        dnf: book.dnf,
        format: book.meta?.duration ? 'audio' : 'print',
        notes: book.notes,
        rating: book.rating,
        tags: book.tags,
        links: book.meta?.GoodreadsID
          ? {
              goodreads: {
                id: book.meta.GoodreadsID,
                url: `https://www.goodreads.com/book/show/${book.meta.GoodreadsID}`,
              },
            }
          : {},
        extra: {},
      };
    });

    return {
      version: 1,
      settings: {},
      books: books,
    };
  },
};

const MIGRATORS = [MigratorV0_V1];
export const CURRENT_VERSION = 1;

export const EMPTY = {
  version: CURRENT_VERSION,
  settings: {},
  books: [],
};

export function migrate(data: any): BooksFile {
  return MIGRATORS.reduce((migratedData, migrator) => {
    if (migrator.shouldApply(migratedData)) {
      return migrator.apply(migratedData);
    }
    return migratedData;
  }, data) as BooksFile;
}

// import * as fs from 'fs';

// const data = JSON.parse(fs.readFileSync('/tmp/mybooks.json', 'utf-8'));
// fs.writeFileSync('/tmp/mybooks_migrated.json', JSON.stringify(migrate(data), null, 2), 'utf-8');
