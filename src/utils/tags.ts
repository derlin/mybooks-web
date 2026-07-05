import type { Book } from '@/types';

export enum TagOperation {
  Filter = 'filter',
  Rename = 'rename',
  Delete = 'delete',
}

export enum BulkOperationState {
  Menu = 'menu',
  Renaming = 'renaming',
  Deleting = 'deleting',
}

export class TagLikeFieldUtil<T extends keyof Book = 'tags'> {
  fieldName: T;

  constructor(fieldName: T) {
    this.fieldName = fieldName;
  }

  validate(value: string): { isValid: true } | { isValid: false; error: string } {
    const trimmed = value.trim();
    if (!trimmed) return { isValid: false, error: 'Value cannot be empty' };
    if (trimmed.length > 32) return { isValid: false, error: 'Value max 32 characters' };
    if (trimmed.includes(' ')) return { isValid: false, error: 'Values cannot contain spaces' };
    return { isValid: true };
  }

  normalize(value: string): string {
    return value.trim();
  }

  getAll(books: Book[]): string[] {
    const valueSet = new Set<string>();
    books.forEach((book) => {
      (book[this.fieldName] as string[])?.forEach((value) => {
        valueSet.add(value);
      });
    });
    return Array.from(valueSet).sort();
  }

  rename(oldValue: string, newValue: string, books: Book[]): Book[] {
    return books.map((book) => {
      if (!(book[this.fieldName] as string[])?.includes(oldValue)) return book;
      return {
        ...book,
        [this.fieldName]: (book[this.fieldName] as string[]).map((value) => (value === oldValue ? newValue : value)),
      };
    });
  }

  delete(value: string, books: Book[]): Book[] {
    return books.map((book) => {
      if (!(book[this.fieldName] as string[])?.includes(value)) return book;
      const newValues = (book[this.fieldName] as string[]).filter((v) => v !== value);
      return {
        ...book,
        [this.fieldName]: newValues.length > 0 ? newValues : undefined,
      };
    });
  }

  getCount(value: string, books: Book[]): number {
    return books.filter((book) => (book[this.fieldName] as string[])?.includes(value)).length;
  }

  exists(value: string, books: Book[]): boolean {
    return this.getAll(books).includes(value);
  }
}

export const TagsUtil = new TagLikeFieldUtil('tags');
