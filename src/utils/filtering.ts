import type { Book, BookFormat } from '../types';

export type DnfFilter = '' | 'dnf' | 'finished';
export type FormatFilter = '' | BookFormat;
export type SearchField = '' | 'title' | 'author' | 'title+author' | 'date' | 'notes';
export type RatingFilter = {
  operator: 'eq' | 'lt' | 'gt';
  value: number;
};

export type FilterState = {
  searchQuery: string;
  dnfFilter: DnfFilter;
  formatFilter: FormatFilter;
  searchField: SearchField;
  tags: string[];
  ratingFilter: RatingFilter | null;
};

export const extractDateNumbers = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  return dateStr.replace(/\D/g, '');
};

export const applyDnfFilter = (books: Book[], dnfFilter: DnfFilter): Book[] => {
  if (dnfFilter === '') return books;
  return books.filter((b) => b.dnf === (dnfFilter === 'dnf'));
};

export const applyFormatFilter = (books: Book[], formatFilter: FormatFilter): Book[] => {
  if (formatFilter === '') return books;
  return books.filter((b) => b.format === formatFilter);
};

export const applySearchFilter = (books: Book[], query: string, searchField: SearchField): Book[] => {
  if (!query) return books;

  const q = query.toLowerCase();

  return books.filter((b) => {
    switch (searchField) {
      case 'title':
        return b.title?.toLowerCase().includes(q);
      case 'author':
        return b.author?.toLowerCase().includes(q);
      case 'title+author':
        return b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q);
      case 'date':
        return b.date_read?.toLowerCase().includes(q);
      case 'notes':
        return b.notes?.toLowerCase().includes(q);
      default:
        return (
          b.title?.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q) ||
          b.date_read?.toLowerCase().includes(q) ||
          b.notes?.toLowerCase().includes(q)
        );
    }
  });
};

export const applyTagLikeFilter = (books: Book[], field: keyof Book, selectedTags: string[]): Book[] => {
  if (!selectedTags.length) return books;
  return books.filter((b) => selectedTags.every((tag) => (b[field] as string[])?.includes(tag)));
};

export const applyRatingFilter = (books: Book[], ratingFilter: RatingFilter | null): Book[] => {
  if (!ratingFilter) return books;

  return books.filter((b) => {
    const rating = b.rating;
    if (rating === null || rating === undefined) return false;

    switch (ratingFilter.operator) {
      case 'eq':
        return rating === ratingFilter.value;
      case 'lt':
        return rating < ratingFilter.value;
      case 'gt':
        return rating > ratingFilter.value;
      default:
        return true;
    }
  });
};

const compareNumbers = (a: number | null | undefined, b: number | null | undefined, descending: boolean): number => {
  const aVal = a || 0;
  const bVal = b || 0;

  if (aVal !== bVal) {
    return descending ? bVal - aVal : aVal - bVal;
  }
  return 0;
};

const compareStrings = (a: string | null | undefined, b: string | null | undefined, descending: boolean): number => {
  const aVal = a?.toLowerCase() || '';
  const bVal = b?.toLowerCase() || '';

  if (aVal !== bVal) {
    return descending ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
  }
  return 0;
};

const compareAny = (a: any, b: any, descending: boolean): number => {
  if (a == null && b == null) return 0;
  if (a == null) return descending ? 1 : -1;
  if (b == null) return descending ? -1 : 1;

  // Fallback to string comparison for other types
  const aStr = String(a);
  const bStr = String(b);
  return compareStrings(aStr, bStr, descending);
};

export const sortBooks = (books: Book[], columnId: string | null, descending: boolean): Book[] => {
  if (!columnId) return books;
  const sorted = [...books].sort((a, b) => {
    if (columnId === 'date_read') {
      return compareStrings(extractDateNumbers(a.date_read), extractDateNumbers(b.date_read), descending);
    }
    if (columnId === 'date_published') {
      return compareStrings(extractDateNumbers(a.date_published), extractDateNumbers(b.date_published), descending);
    }
    if (columnId === 'pages') {
      return compareNumbers(a.pages, b.pages, descending);
    }
    if (columnId === 'duration') {
      return compareNumbers(a.duration, b.duration, descending);
    }
    if (columnId === 'rating') {
      return compareNumbers(a.rating ?? -1, b.rating ?? -1, descending);
    }
    return compareAny((a as any)[columnId], (b as any)[columnId], descending);
  });

  return sorted;
};

export type FilterAndSortOptions = FilterState & {
  sortBy?: string | null;
  sortDesc?: boolean;
};

export const filterAndSort = (books: Book[], options: Partial<FilterAndSortOptions> = {}): Book[] => {
  const opts = {
    searchQuery: '',
    dnfFilter: '' as DnfFilter,
    formatFilter: '' as FormatFilter,
    searchField: '' as SearchField,
    tags: [],
    ratingFilter: null as RatingFilter | null,
    sortBy: null,
    sortDesc: false,
    ...options,
  };

  let result = books;
  if (opts.dnfFilter) result = applyDnfFilter(result, opts.dnfFilter);
  if (opts.formatFilter) result = applyFormatFilter(result, opts.formatFilter);
  if (opts.searchQuery) result = applySearchFilter(result, opts.searchQuery, opts.searchField);
  if (opts.tags.length) result = applyTagLikeFilter(result, 'tags', opts.tags);
  if (opts.ratingFilter) result = applyRatingFilter(result, opts.ratingFilter);
  if (opts.sortBy) result = sortBooks(result, opts.sortBy, opts.sortDesc);

  return result;
};
