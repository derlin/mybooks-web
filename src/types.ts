// v1

export type BookFormat = 'print' | 'audio' | 'ebook';

export type Settings = {
  // Add any settings you want to store here
};

export type BookWithoutKey = {
  // book info
  title: string;
  author: string;
  date_published: string; // YYYY-MM, YYYY, or "?"
  isbn?: string;
  pages?: number;
  duration?: number; // minutes; presence = is audiobook
  // book reading
  date_read: string; // YYYY-MM, YYYY, or "?"
  dnf: boolean;
  format: BookFormat;
  notes: string;
  rating?: number | null; // 0-5, one decimal place
  // Other
  links: Record<string, { id: string; url: string }>;
  tags?: string[];
  extra?: {
    [key: string]: unknown; // anything else
  };
};

export type Book = BookWithoutKey & { _key: string };

export type BooksFile = {
  version: number;
  settings: Settings;
  books: BookWithoutKey[];
};
