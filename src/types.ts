export type BookMeta = {
  GoodreadsID?: string | null;
  ISBN?: string | null;
  pubDate?: string | null; // ISO format
  pages?: number | null;
  duration?: number; // minutes; presence = is audiobook
};

export type Book = {
  title: string;
  author: string;
  date: string; // YYYY-MM, YYYY, or "?"
  dnf: boolean;
  notes: string;
  tags?: string[];
  rating?: number | null; // 0-5, one decimal place
  meta?: BookMeta;
  _key: string; // normalized title used as Dropbox map key (always present in memory)
};
