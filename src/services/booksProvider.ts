import { BOOKS_FILE_PATH } from '../env';
import type { Book } from '../types';
import { type IDropboxService, NotFoundError } from './dropboxService';

// -------

function removeEmpty<T>(obj: T): Partial<T> | undefined {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  // Handle Primitives & Non-Plain Objects (Dates, RegExps, etc.)
  if (typeof obj !== 'object' || obj instanceof Date || obj instanceof RegExp) {
    return obj;
  }
  // Handle Arrays
  if (Array.isArray(obj)) {
    const cleanedArray = obj
      .map((item) => removeEmpty(item))
      .filter((item): item is NonNullable<typeof item> => item !== undefined);

    return (cleanedArray.length > 0 ? cleanedArray : undefined) as unknown as Partial<T>;
  }
  // Handle Objects
  const cleanedObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanedValue = removeEmpty(value);
    // Only keep properties that returned a defined, non-empty value
    if (cleanedValue !== undefined) {
      cleanedObj[key] = cleanedValue;
    }
  }
  return Object.keys(cleanedObj).length > 0 ? (cleanedObj as Partial<T>) : undefined;
}

// -------

export class BooksProvider {
  private syncedRevision: string | null = null;

  constructor(private dropboxService: IDropboxService) {}

  private getSyncedRevision(): string | null {
    return this.syncedRevision;
  }

  private setSyncedRevision(rev: string): void {
    this.syncedRevision = rev;
  }

  private booksMapToArray(booksMap: Record<string, any>): Book[] {
    return Object.entries(booksMap).map(([key, book]) => ({
      ...(book as Omit<Book, '_key'>),
      _key: key,
    }));
  }

  serializeBooks(books: Book[]): Record<string, any> {
    return Object.fromEntries(
      books.map(({ _key, ...value }) => {
        const serialized: any = removeEmpty(value);
        return [_key, serialized];
      })
    );
  }

  async downloadBooks(): Promise<Book[]> {
    console.log('[BooksProvider] Downloading books');
    try {
      const metadata = await this.dropboxService.downloadFile(BOOKS_FILE_PATH);
      if (!metadata.fileContent) {
        throw new Error('No file content in response');
      }
      const booksMap = JSON.parse(metadata.fileContent) as Record<string, any>;
      this.setSyncedRevision(metadata.rev);
      return this.booksMapToArray(booksMap);
    } catch (err: any) {
      if (err instanceof NotFoundError) {
        await this.uploadBooks([]);
        return [];
      }
      throw err;
    }
  }

  async uploadBooks(books: Book[]): Promise<void> {
    console.log('[BooksProvider] Uploading books');
    const cleanedData = this.serializeBooks(books);
    await this.uploadBookMapToDropbox(cleanedData);
  }

  async uploadBookMapToDropbox(cleanedData: Record<string, any>): Promise<void> {
    const content = JSON.stringify(cleanedData, null, 2);
    const metadata = await this.dropboxService.uploadFile(
      BOOKS_FILE_PATH,
      new Blob([content], { type: 'application/json' })
    );
    this.setSyncedRevision(metadata.rev);
  }

  async checkFileRevision(): Promise<boolean> {
    console.log('[BooksProvider] Checking file revision');
    try {
      const metadata = await this.dropboxService.getRevision(BOOKS_FILE_PATH);
      const syncedRev = this.getSyncedRevision();
      return metadata.rev !== syncedRev;
    } catch (err: any) {
      console.error('[BooksProvider] Error checking file revision:', err);
      throw err;
    }
  }
}

export const __TEST__ = {
  removeEmpty,
};
