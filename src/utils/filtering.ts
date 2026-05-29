import type { Book } from '../types';

export const extractDateNumbers = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  return dateStr.replace(/\D/g, '');
};

export const applyDnfFilter = (books: Book[], dnfFilter: string): Book[] => {
  if (dnfFilter === 'dnf') {
    return books.filter((b) => b.dnf);
  } else if (dnfFilter === 'finished') {
    return books.filter((b) => !b.dnf);
  }
  return books;
};

export const applyFormatFilter = (books: Book[], audiobookFilter: string): Book[] => {
  if (audiobookFilter === 'audiobook') {
    return books.filter((b) => b.meta?.duration);
  } else if (audiobookFilter === 'paper') {
    return books.filter((b) => !b.meta?.duration);
  }
  return books;
};

export const applySearchFilter = (books: Book[], query: string, searchField: string): Book[] => {
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

type FilterAndSortOptions = {
  dnfFilter?: string;
  audiobookFilter?: string;
  searchQuery?: string;
  searchField?: string;
  sortBy?: string | null;
  sortDesc?: boolean;
};

export const filterAndSort = (books: Book[], options: FilterAndSortOptions = {}): Book[] => {
  const {
    dnfFilter = 'all',
    audiobookFilter = 'all',
    searchQuery = '',
    searchField = 'anything',
    sortBy = null,
    sortDesc = false,
  } = options;

  let result = books;

  result = applyDnfFilter(result, dnfFilter);
  result = applyFormatFilter(result, audiobookFilter);
  result = applySearchFilter(result, searchQuery, searchField);

  if (sortBy) {
    result = sortBooks(result, sortBy, sortDesc);
  }

  return result;
};
