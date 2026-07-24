import type { Book } from '../types';
import { normalizeTitle } from './books';

export const DURATION_REGEX = /^(\d+)h(\d{1,2})?$/;

export const validateDuration = (duration: string): { error?: string; formatted?: string } => {
  const trimmed = duration.trim();
  if (!trimmed) return {};

  const match = trimmed.match(DURATION_REGEX);
  if (!match) {
    return { error: 'Format: Xh or Xh:MM (e.g., 7h34)' };
  }
  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  if (minutes > 59) {
    return { error: 'Minutes must be 0-59' };
  }
  return { formatted: `${hours}h${String(minutes).padStart(2, '0')}` };
};

export const durationToMinutes = (durationStr: string | null | undefined): number | null => {
  if (!durationStr) return null;

  const match = durationStr.match(DURATION_REGEX);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  return hours * 60 + minutes;
};

export const minutesToDuration = (minutes: number | null | undefined): string => {
  if (!minutes || minutes < 0) return '';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h${String(mins).padStart(2, '0')}`;
};

export const formatDateString = (dateStr: string): string => {
  const date = dateStr.trim();
  if (!date) return '';

  if (date === '?') return date;

  if (/^\d{4}$/.test(date)) {
    return date;
  }

  const parts = date.split('-');

  if (parts.length === 2) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}`;
  }

  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  return date;
};

export const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getFilteredAuthors = (query: string, allBooks: Book[]): string[] => {
  if (!query) return [];

  const q = query.toLowerCase();
  const authors = new Set(allBooks.map((b) => b.author).filter((a): a is string => !!a && a.toLowerCase().includes(q)));

  return Array.from(authors).sort();
};

type DuplicateCheck = {
  isDuplicate: boolean;
  error: string | null;
};

export const isValidRating = (rating: number | null | undefined): boolean => {
  if (rating !== 0 && !rating) return true;
  const num = Number(rating);
  return !Number.isNaN(num) && num >= 0 && num <= 5;
};

export const checkDuplicateTitle = (newTitle: string, allBooks: Book[], currentBookKey?: string): DuplicateCheck => {
  const normalizedNewTitle = normalizeTitle(newTitle);
  const isDuplicate = allBooks.some((book) => book._key === normalizedNewTitle && book._key !== currentBookKey);

  return {
    isDuplicate,
    error: isDuplicate ? 'A book with this title already exists' : null,
  };
};
