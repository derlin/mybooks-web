export const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

import type { Book } from '../types';

export const googleUrlFor = (book: Book): string => {
  const query = encodeURIComponent(`${book.title} ${book.author || ''}`);
  const lang = navigator.language.split('-')[0];
  return `https://www.google.com/search?lr=lang_${lang}&q=${query}&pws=0&gl=us&gws_rd=cr`;
};
