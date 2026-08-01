import type { Book } from '../types';

export type TsvColumn = {
  id: string; // stable id used for value extraction (e.g. "title", "links.goodreads.url")
  label: string; // header shown in the TSV / popup (e.g. "title", "goodreads.url")
};

// Fields that are never offered as-is: `extra` is free-form, `links` is expanded
// per-identifier below, `tags` gets special comma-join handling.
const NON_SCALAR_FIELDS = new Set(['extra', 'links', 'tags']);

/**
 * Derive the available TSV columns from the actual book data, so the list follows
 * the model without any hardcoded schema. Scalar fields become one column each,
 * `tags` a single comma-joined column, and every `links.<id>` found across all
 * books expands to `<id>.id` and `<id>.url` columns. `extra` is excluded.
 */
export const getExportColumns = (books: Book[]): TsvColumn[] => {
  const scalarKeys: string[] = [];
  const seenScalar = new Set<string>();
  let hasTags = false;
  const linkIds = new Set<string>();

  for (const book of books) {
    for (const key of Object.keys(book)) {
      if (key === 'tags') {
        hasTags = true;
      } else if (key === 'links') {
        for (const id of Object.keys(book.links ?? {})) linkIds.add(id);
      } else if (!NON_SCALAR_FIELDS.has(key) && !seenScalar.has(key)) {
        seenScalar.add(key);
        scalarKeys.push(key);
      }
    }
  }

  const columns: TsvColumn[] = scalarKeys.map((id) => ({ id, label: id }));
  if (hasTags) columns.push({ id: 'tags', label: 'tags' });
  for (const id of [...linkIds].sort()) {
    columns.push({ id: `links.${id}.id`, label: `${id}.id` });
    columns.push({ id: `links.${id}.url`, label: `${id}.url` });
  }
  return columns;
};

/** Extract a single cell as a string for the given column id. */
export const getCellValue = (book: Book, columnId: string): string => {
  if (columnId === 'tags') return (book.tags ?? []).join(',');
  if (columnId.startsWith('links.')) {
    const [, id, prop] = columnId.split('.'); // prop is "id" or "url"
    const value = book.links?.[id]?.[prop as 'id' | 'url'];
    return value == null ? '' : String(value);
  }
  const value = (book as Record<string, unknown>)[columnId];
  return value == null ? '' : String(value);
};

const escapeCell = (value: string): string => value.replace(/[\t\n\r]/g, ' ');

/** Build the TSV text (header + rows) for the given, already-sorted books. */
export const buildTsv = (books: Book[], columns: TsvColumn[]): string => {
  const header = columns.map((c) => escapeCell(c.label)).join('\t');
  const rows = books.map((book) => columns.map((c) => escapeCell(getCellValue(book, c.id))).join('\t'));
  return [header, ...rows].join('\n');
};
