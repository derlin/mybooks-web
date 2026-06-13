import type { Book } from '../types';
import type { IDropboxService } from './dropboxService';

const BOOKS_FILE_PATH = import.meta.env.VITE_BOOKS_FILE_PATH || '/mybooks.json';

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
      books.map(({ _key, meta, ...rest }) => {
        const serialized: any = rest;
        if (meta) {
          const cleanedMeta = Object.fromEntries(Object.entries(meta).filter(([, v]) => v != null));
          if (Object.keys(cleanedMeta).length > 0) {
            serialized.meta = cleanedMeta;
          }
        }
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
      if (err.message?.includes('File not found')) {
        this.setSyncedRevision('');
        return [];
      }
      throw err;
    }
  }

  async uploadBooks(books: Book[]): Promise<void> {
    console.log('[BooksProvider] Uploading books');
    const cleanedData = this.serializeBooks(books);
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
