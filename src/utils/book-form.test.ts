// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { bookToFormData, formDataToBook } from './book-form';

const sampleBook = {
  _key: 'abc123',
  title: 'Dune',
  author: 'Frank Herbert',
  date_published: '1965',
  isbn: '9780441013593',
  pages: 412,
  duration: 454, // minutes -> "7h34"
  date_read: '2024-01-15',
  dnf: false,
  format: 'print',
  notes: 'great',
  rating: 4.5,
  tags: ['sci-fi'],
  links: {
    goodreads: { id: '234225', url: 'https://www.goodreads.com/book/show/234225' },
  },
  extra: { imported: true },
};

describe('bookToFormData', () => {
  it('returns a blank draft when no book is given', () => {
    const form = bookToFormData();
    expect(form.title).toBe('');
    expect(form.author).toBe('');
    expect(form.pages).toBeNull();
    expect(form.rating).toBeNull();
    expect(form.duration).toBe('');
    expect(form.format).toBe('print');
    expect(form.dnf).toBe(false);
    expect(form.tags).toEqual([]);
    expect(form.links).toEqual([]);
    expect(form.date_read).toBeTruthy(); // today's date
  });

  it('maps an existing book into editable form state', () => {
    const form = bookToFormData(sampleBook);
    expect(form.title).toBe('Dune');
    expect(form.pages).toBe(412);
    expect(form.duration).toBe('7h34'); // minutes rendered as human string
    expect(form.rating).toBe(4.5);
    expect(form.links).toEqual([
      { name: 'goodreads', id: '234225', url: 'https://www.goodreads.com/book/show/234225' },
    ]);
  });

  it('falls back to defaults for missing optional fields', () => {
    const minimal = {
      _key: 'k',
      title: 'T',
      author: 'A',
      date_published: '',
      date_read: '2024-01-01',
      dnf: false,
      format: 'audio',
      notes: '',
      links: {},
    };
    const form = bookToFormData(minimal);
    expect(form.isbn).toBe('');
    expect(form.pages).toBeNull();
    expect(form.duration).toBe('');
    expect(form.rating).toBeNull();
    expect(form.tags).toEqual([]);
    expect(form.links).toEqual([]);
  });
});

describe('formDataToBook', () => {
  it('preserves fields the form does not manage (_key, extra)', () => {
    const form = bookToFormData(sampleBook);
    const result = formDataToBook(form, sampleBook);
    expect(result._key).toBe('abc123');
    expect(result.extra).toEqual({ imported: true });
  });

  it('converts duration string back to minutes and links array to a record', () => {
    const form = bookToFormData(sampleBook);
    const result = formDataToBook(form, sampleBook);
    expect(result.duration).toBe(454);
    expect(result.links).toEqual({
      goodreads: { id: '234225', url: 'https://www.goodreads.com/book/show/234225' },
    });
  });

  it('drops links that are missing any part, and lowercases the name key', () => {
    const form = bookToFormData();
    form.links = [
      { name: 'StoryGraph', id: '1', url: 'https://x' },
      { name: 'incomplete', id: '', url: 'https://y' },
    ];
    const result = formDataToBook(form, null);
    expect(result.links).toEqual({ storygraph: { id: '1', url: 'https://x' } });
  });

  it('normalizes empty duration/rating to null', () => {
    const form = bookToFormData();
    const result = formDataToBook(form, null);
    expect(result.duration).toBeNull();
    expect(result.rating).toBeNull();
  });

  it('round-trips a book through form and back without losing data', () => {
    const result = formDataToBook(bookToFormData(sampleBook), sampleBook);
    expect(result.title).toBe(sampleBook.title);
    expect(result.pages).toBe(sampleBook.pages);
    expect(result.duration).toBe(sampleBook.duration);
    expect(result.rating).toBe(sampleBook.rating);
    expect(result.tags).toEqual(sampleBook.tags);
    expect(result.links).toEqual(sampleBook.links);
  });
});
