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
 * Includes only approved fields: title, author, date, dnf, notes, meta.
 * Excludes internal properties like _key and Vue tracking fields.
 * @param {Object} booksData - Map of books (key -> book object)
 * @returns {Object} Serialized books with only approved fields
 */
export const serializeBooks = (booksData) => {
  const cleaned = {};
  for (const [key, book] of Object.entries(booksData)) {
    const serialized = {
      title: book.title,
      author: book.author,
      date: book.date,
      dnf: book.dnf,
      notes: book.notes,
    };
    if (book.meta && Object.keys(book.meta).length > 0) {
      serialized.meta = book.meta;
    }
    cleaned[key] = serialized;
  }
  return cleaned;
};
