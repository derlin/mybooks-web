import type { Book } from '../types';

export type DnfFilter = 'all' | 'dnf' | 'finished';
export type AudiobookFilter = 'all' | 'audiobook' | 'paper';
export type SearchField = 'anything' | 'title' | 'author' | 'title+author' | 'date' | 'notes';
export type RatingFilter = {
  operator: 'eq' | 'lt' | 'gt';
  value: number;
};

export type FilterState = {
  query: string;
  dnf: DnfFilter;
  audiobook: AudiobookFilter;
  searchField: SearchField;
  tags: string[];
  rating?: RatingFilter | null;
};

export const DEFAULT_DNF_FILTER: DnfFilter = 'all';
export const DEFAULT_AUDIOBOOK_FILTER: AudiobookFilter = 'all';
export const DEFAULT_SEARCH_FIELD: SearchField = 'anything';
export const DEFAULT_TAGS_FILTER: string[] = [];
export const DEFAULT_RATING_FILTER: RatingFilter | null = null;

export const DNF_FILTER_OPTIONS: { value: DnfFilter; label: string }[] = [
  { value: 'all', label: 'All books' },
  { value: 'dnf', label: 'Did not finish' },
  { value: 'finished', label: 'Finished' },
];

export const AUDIOBOOK_FILTER_OPTIONS: { value: AudiobookFilter; label: string }[] = [
  { value: 'all', label: 'All formats' },
  { value: 'audiobook', label: 'Audiobooks' },
  { value: 'paper', label: 'Paper books' },
];

export const SEARCH_FIELD_OPTIONS: { value: SearchField; label: string }[] = [
  { value: 'anything', label: 'Anything' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'title+author', label: 'Title + Author' },
  { value: 'date', label: 'Date' },
  { value: 'notes', label: 'Notes' },
];

export const extractDateNumbers = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  return dateStr.replace(/\D/g, '');
};

export const applyDnfFilter = (books: Book[], dnfFilter: DnfFilter): Book[] => {
  if (dnfFilter === 'dnf') {
    return books.filter((b) => b.dnf);
  }
  if (dnfFilter === 'finished') {
    return books.filter((b) => !b.dnf);
  }
  return books;
};

export const applyFormatFilter = (books: Book[], audiobookFilter: AudiobookFilter): Book[] => {
  if (audiobookFilter === 'audiobook') {
    return books.filter((b) => b.meta?.duration);
  }
  if (audiobookFilter === 'paper') {
    return books.filter((b) => !b.meta?.duration);
  }
  return books;
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
        return b.date?.toLowerCase().includes(q);
      case 'notes':
        return b.notes?.toLowerCase().includes(q);
      default:
        return (
          b.title?.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q) ||
          b.date?.toLowerCase().includes(q) ||
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
    if (columnId === 'date') {
      return compareStrings(extractDateNumbers(a.date), extractDateNumbers(b.date), descending);
    }
    if (columnId === 'pages') {
      return compareNumbers(a.meta?.pages, b.meta?.pages, descending);
    }
    if (columnId === 'duration') {
      return compareNumbers(a.meta?.duration, b.meta?.duration, descending);
    }
    if (columnId === 'rating') {
      return compareNumbers(a.rating ?? -1, b.rating ?? -1, descending);
    }
    return compareAny((a as any)[columnId], (b as any)[columnId], descending);
  });

  return sorted;
};

export type FilterAndSortOptions = {
  dnfFilter?: DnfFilter;
  audiobookFilter?: AudiobookFilter;
  searchQuery?: string;
  searchField?: SearchField;
  tags?: string[];
  rating?: RatingFilter | null;
  sortBy?: string | null;
  sortDesc?: boolean;
};

export const filterAndSort = (books: Book[], options: FilterAndSortOptions = {}): Book[] => {
  const {
    dnfFilter = DEFAULT_DNF_FILTER,
    audiobookFilter = DEFAULT_AUDIOBOOK_FILTER,
    searchQuery = '',
    searchField = DEFAULT_SEARCH_FIELD,
    tags = DEFAULT_TAGS_FILTER,
    rating = DEFAULT_RATING_FILTER,
    sortBy = null,
    sortDesc = false,
  } = options;

  let result = books;

  result = applyDnfFilter(result, dnfFilter);
  result = applyFormatFilter(result, audiobookFilter);
  result = applySearchFilter(result, searchQuery, searchField);
  result = applyTagLikeFilter(result, 'tags', tags);
  result = applyRatingFilter(result, rating);

  if (sortBy) {
    result = sortBooks(result, sortBy, sortDesc);
  }

  return result;
};
