/**
 * Extract numbers from date strings for sorting.
 * Handles non-standard dates like "??", "New Zealand" by treating as 0.
 */
export const extractDateNumbers = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.replace(/\D/g, '');
};

/**
 * Apply DNF (Did Not Finish) filter to books array.
 * @param {Array} books - Books to filter
 * @param {string} dnfFilter - 'dnf', 'finished', or 'all'
 * @returns {Array} Filtered books
 */
export const applyDnfFilter = (books, dnfFilter) => {
  if (dnfFilter === 'dnf') {
    return books.filter((b) => b.dnf);
  } else if (dnfFilter === 'finished') {
    return books.filter((b) => !b.dnf);
  }
  return books;
};

/**
 * Apply format (audiobook/paper) filter to books array.
 * @param {Array} books - Books to filter
 * @param {string} audiobookFilter - 'audiobook', 'paper', or 'all'
 * @returns {Array} Filtered books
 */
export const applyFormatFilter = (books, audiobookFilter) => {
  if (audiobookFilter === 'audiobook') {
    return books.filter((b) => b.meta?.duration);
  } else if (audiobookFilter === 'paper') {
    return books.filter((b) => !b.meta?.duration);
  }
  return books;
};

/**
 * Apply global search filter across specified fields.
 * @param {Array} books - Books to filter
 * @param {string} query - Search query (will be lowercased)
 * @param {string} searchField - Which field(s) to search
 * @returns {Array} Filtered books
 */
export const applySearchFilter = (books, query, searchField) => {
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
      case 'anything':
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

/**
 * Sort books by specified column.
 * @param {Array} books - Books to sort
 * @param {string} columnId - Column identifier (title, author, date, duration, pages, dnf)
 * @param {boolean} descending - Sort descending if true
 * @returns {Array} Sorted books
 */
export const sortBooks = (books, columnId, descending) => {
  if (!columnId) return books;

  const sorted = [...books].sort((a, b) => {
    // Date sorting: extract numbers, handle non-numeric dates
    if (columnId === 'date') {
      const aDigits = extractDateNumbers(a.date);
      const bDigits = extractDateNumbers(b.date);
      const aNum = parseInt(aDigits) || 0;
      const bNum = parseInt(bDigits) || 0;

      if (aNum !== bNum) {
        return descending ? bNum - aNum : aNum - bNum;
      }
      // Fallback to title comparison if dates are equal
      const aTitle = a.title?.toLowerCase() || '';
      const bTitle = b.title?.toLowerCase() || '';
      return aTitle.localeCompare(bTitle);
    }

    // Pages sorting: treat null as 0
    if (columnId === 'pages') {
      const aPages = a.meta?.pages || 0;
      const bPages = b.meta?.pages || 0;

      if (aPages !== bPages) {
        return descending ? bPages - aPages : aPages - bPages;
      }
      return 0;
    }

    // Duration sorting: treat null as 0
    if (columnId === 'duration') {
      const aDuration = a.meta?.duration || 0;
      const bDuration = b.meta?.duration || 0;

      if (aDuration !== bDuration) {
        return descending ? bDuration - aDuration : aDuration - bDuration;
      }
      return 0;
    }

    // Generic string/value sorting for other columns
    let aVal = a[columnId];
    let bVal = b[columnId];

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

/**
 * Apply all filters and sort in sequence.
 * @param {Array} books - Books to filter and sort
 * @param {Object} options - Filter and sort options
 * @returns {Array} Filtered and sorted books
 */
export const filterAndSort = (books, options = {}) => {
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
