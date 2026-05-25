export const normalizeTitle = (title) => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const booksToMap = (books) => {
  return Object.fromEntries(books.map((b) => [b._key, { ...b }]));
};

export const buildBookMeta = (meta) => ({
  pages: meta.pages || null,
  duration: meta.duration,
  GoodreadsID: meta.GoodreadsID || null,
  ISBN: meta.ISBN || null,
  pubDate: meta.pubDate || null,
});

/**
 * Serialize books map for Dropbox upload.
 * Includes only approved fields: title, author, date, dnf, duration, notes, meta.
 * Excludes internal properties like _key and Vue tracking fields.
 * @param {Object} booksData - Map of books (key -> book object)
 * @returns {Object} Serialized books with only approved fields
 */
export const serializeBooks = (booksData) => {
  const cleaned = {};
  for (const [key, book] of Object.entries(booksData)) {
    const serialized = {};
    // Explicitly check valid fields, to avoid serializing "_key" and others
    for (const field of ['title', 'author', 'date', 'dnf', 'notes']) {
      if (book[field] !== null && book[field] !== undefined) {
        serialized[field] = book[field];
      }
    }
    if (book.meta && Object.keys(book.meta).length > 0) {
      // Only include meta if it has at least one non-null, non-undefined value
      const metaWithValues = {};
      for (const [field, value] of Object.entries(book.meta)) {
        if (value !== null && value !== undefined) {
          metaWithValues[field] = value;
        }
      }
      if (Object.keys(metaWithValues).length > 0) {
        serialized.meta = metaWithValues;
      }
    }
    cleaned[key] = serialized;
  }
  return cleaned;
};
