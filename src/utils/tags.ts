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

export function validateTag(tag: string): { isValid: true } | { isValid: false; error: string } {
  const trimmed = tag.trim();
  if (!trimmed) return { isValid: false, error: 'Tag cannot be empty' };
  if (trimmed.length > 32) return { isValid: false, error: 'Tag max 32 characters' };
  if (trimmed.includes(' ')) return { isValid: false, error: 'Tags cannot contain spaces' };
  return { isValid: true };
}

export function normalizeTag(tag: string): string {
  return tag.trim();
}

export function getTagsFromAllBooks(books: Book[]): string[] {
  const tagSet = new Set<string>();
  books.forEach((book) => {
    book.tags?.forEach((tag) => {
      tagSet.add(tag);
    });
  });
  return Array.from(tagSet).sort();
}

export function renameTagInBooks(oldTag: string, newTag: string, books: Book[]): Book[] {
  return books.map((book) => {
    if (!book.tags?.includes(oldTag)) return book;
    return {
      ...book,
      tags: book.tags.map((tag) => (tag === oldTag ? newTag : tag)),
    };
  });
}

export function deleteTagFromBooks(tag: string, books: Book[]): Book[] {
  return books.map((book) => {
    if (!book.tags?.includes(tag)) return book;
    const newTags = book.tags.filter((t) => t !== tag);
    return {
      ...book,
      tags: newTags.length > 0 ? newTags : undefined,
    };
  });
}

export function getBookCountForTag(tag: string, books: Book[]): number {
  return books.filter((book) => book.tags?.includes(tag)).length;
}

export function tagExists(tag: string, books: Book[]): boolean {
  return getTagsFromAllBooks(books).includes(tag);
}
