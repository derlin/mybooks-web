import type { Book } from '../types';

export type DnfFilter = 'all' | 'dnf' | 'finished';
export type AudiobookFilter = 'all' | 'audiobook' | 'paper';
export type SearchField = 'anything' | 'title' | 'author' | 'title+author' | 'date' | 'notes';

export type FilterState = {
  query: string;
  dnf: DnfFilter;
  audiobook: AudiobookFilter;
  searchField: SearchField;
  tags: string[];
};

export const DEFAULT_DNF_FILTER: DnfFilter = 'all';
export const DEFAULT_AUDIOBOOK_FILTER: AudiobookFilter = 'all';
export const DEFAULT_SEARCH_FIELD: SearchField = 'anything';
export const DEFAULT_TAGS_FILTER: string[] = [];

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

export const applyTagsFilter = (books: Book[], selectedTags: string[]): Book[] => {
  if (!selectedTags.length) return books;
  return books.filter((b) => selectedTags.every((tag) => b.tags?.includes(tag)));
};

export const sortBooks = (books: Book[], columnId: string | null, descending: boolean): Book[] => {
  if (!columnId) return books;

  const sorted = [...books].sort((a, b) => {
    if (columnId === 'date') {
      const aDigits = extractDateNumbers(a.date);
      const bDigits = extractDateNumbers(b.date);
      const aNum = parseInt(aDigits, 10) || 0;
      const bNum = parseInt(bDigits, 10) || 0;

      if (aNum !== bNum) {
        return descending ? bNum - aNum : aNum - bNum;
      }
      const aTitle = a.title?.toLowerCase() || '';
      const bTitle = b.title?.toLowerCase() || '';
      return aTitle.localeCompare(bTitle);
    }

    if (columnId === 'pages') {
      const aPages = a.meta?.pages || 0;
      const bPages = b.meta?.pages || 0;

      if (aPages !== bPages) {
        return descending ? bPages - aPages : aPages - bPages;
      }
      return 0;
    }

    if (columnId === 'duration') {
      const aDuration = a.meta?.duration || 0;
      const bDuration = b.meta?.duration || 0;

      if (aDuration !== bDuration) {
        return descending ? bDuration - aDuration : aDuration - bDuration;
      }
      return 0;
    }

    let aVal: any = (a as any)[columnId];
    let bVal: any = (b as any)[columnId];

    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return descending ? -cmp : cmp;
    }

    if (aVal < bVal) return descending ? 1 : -1;
    if (aVal > bVal) return descending ? -1 : 1;
    return 0;
  });

  return sorted;
};

export type FilterAndSortOptions = {
  dnfFilter?: DnfFilter;
  audiobookFilter?: AudiobookFilter;
  searchQuery?: string;
  searchField?: SearchField;
  tags?: string[];
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
    sortBy = null,
    sortDesc = false,
  } = options;

  let result = books;

  result = applyDnfFilter(result, dnfFilter);
  result = applyFormatFilter(result, audiobookFilter);
  result = applySearchFilter(result, searchQuery, searchField);
  result = applyTagsFilter(result, tags);

  if (sortBy) {
    result = sortBooks(result, sortBy, sortDesc);
  }

  return result;
};
