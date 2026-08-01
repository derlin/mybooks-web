import type { Book } from '../types';
import { durationToMinutes, getTodayDate, minutesToDuration } from './helpers';

/**
 * The editable shape backing the Add/Edit form. It diverges from `Book` where
 * the form needs a friendlier representation:
 *  - `duration` is a human string (e.g. "7h34") instead of minutes
 *  - `links` is an ordered array (with an editable `name`) instead of a record
 *  - numeric fields are nullable so empty inputs stay empty rather than 0
 */
export type FormData = Omit<Book, '_key' | 'pages' | 'duration' | 'rating' | 'links'> & {
  pages: number | null;
  duration: string;
  tags: string[];
  rating: number | null;
  links: Array<{ name: string; id: string; url: string }>;
};

/** Build form state from an existing book, or a blank draft when adding. */
export const bookToFormData = (book: Book | null | undefined = undefined): FormData => {
  const linksArray = book?.links
    ? Object.entries(book.links).map(([name, link]) => ({
        name,
        id: link.id,
        url: link.url,
      }))
    : [];

  if (book) {
    return {
      title: book.title,
      author: book.author,
      date_published: book.date_published || '',
      isbn: book.isbn || '',
      pages: book.pages ? Number(book.pages) : null,
      duration: book.duration ? minutesToDuration(book.duration) : '',
      date_read: book.date_read,
      dnf: book.dnf || false,
      format: book.format ?? 'print',
      notes: book.notes || '',
      rating: book.rating ?? null,
      tags: book.tags ?? [],
      links: linksArray,
    };
  }
  return {
    title: '',
    author: '',
    date_published: '',
    isbn: '',
    pages: null,
    duration: '',
    date_read: getTodayDate(),
    dnf: false,
    format: 'print',
    notes: '',
    tags: [],
    rating: null,
    links: [],
  };
};

/**
 * Convert form state back into a book payload, merged onto the original book so
 * fields the form doesn't manage (e.g. `_key`, `extra`) are preserved. Links
 * with any missing part are dropped.
 */
export const formDataToBook = (formData: FormData, original: Book | null) => {
  const { links: linksArray, ...values } = formData;
  const linksRecord = linksArray.reduce(
    (acc, link) => {
      if (link.name && link.id && link.url) {
        acc[link.name.toLowerCase()] = { id: link.id, url: link.url };
      }
      return acc;
    },
    {} as Record<string, { id: string; url: string }>
  );

  return {
    ...(original || {}),
    ...values,
    duration: values.duration ? durationToMinutes(values.duration) : null,
    rating: values.rating ?? null,
    links: linksRecord,
  };
};
