/**
 * Validation utilities for EditForm
 */

import { normalizeTitle } from './books';

export const DURATION_REGEX = /^(\d+)h(\d{1,2})?$/;

/**
 * Validate title (required, non-empty when trimmed).
 * @param {string} title - Title to validate
 * @returns {boolean} True if valid
 */
export const isValidTitle = (title) => {
  return !!title.trim();
};

/**
 * Validate author (required, non-empty when trimmed).
 * @param {string} author - Author to validate
 * @returns {boolean} True if valid
 */
export const isValidAuthor = (author) => {
  return !!author.trim();
};

/**
 * Validate and format duration string.
 * Accepts formats: "7h", "7h34", "7h:34"
 * @param {string} duration - Duration to validate
 * @returns {Object} { isValid: boolean, error?: string, formatted?: string }
 */
export const validateDuration = (duration) => {
  const trimmed = duration.trim();

  // Empty is valid (optional field)
  if (!trimmed) {
    return { isValid: true };
  }

  // Check format
  const match = trimmed.match(DURATION_REGEX);
  if (!match) {
    return {
      isValid: false,
      error: 'Format: Xh or Xh:MM (e.g., 7h34)',
    };
  }

  const hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;

  // Validate minutes
  if (minutes > 59) {
    return {
      isValid: false,
      error: 'Minutes must be 0-59',
    };
  }

  // Return formatted version
  return {
    isValid: true,
    formatted: `${hours}h${String(minutes).padStart(2, '0')}`,
  };
};

/**
 * Convert duration string to minutes.
 * @param {string} durationStr - Duration in format "7h34"
 * @returns {number|null} Minutes or null if invalid
 */
export const durationToMinutes = (durationStr) => {
  if (!durationStr) return null;

  const match = durationStr.match(DURATION_REGEX);
  if (!match) return null;

  const hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;

  return hours * 60 + minutes;
};

/**
 * Convert minutes to duration string.
 * @param {number} minutes - Total minutes
 * @returns {string} Duration in format "Xh" or "Xh:MM"
 */
export const minutesToDuration = (minutes) => {
  if (!minutes || minutes < 0) return '';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h${String(mins).padStart(2, '0')}`;
};

/**
 * Format date string with zero-padding.
 * Accepts: "YYYY", "YYYY-M", "YYYY-MM", "YYYY-M-D", "YYYY-MM-DD", "?"
 * Returns the formatted version or the original if invalid.
 * @param {string} dateStr - Date string to format
 * @returns {string} Formatted date string
 */
export const formatDateString = (dateStr) => {
  let date = dateStr.trim();
  if (!date) return '';

  // Special case: "?" is valid as-is
  if (date === '?') return date;

  // Single year format: "YYYY" is valid as-is
  if (/^\d{4}$/.test(date)) {
    return date;
  }

  const parts = date.split('-');

  // Two parts: "YYYY-M" → "YYYY-MM"
  if (parts.length === 2) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}`;
  }

  // Three parts: "YYYY-M-D" → "YYYY-MM-DD"
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // Invalid format, return as-is
  return date;
};

/**
 * Get today's date in YYYY-MM-DD format.
 * @returns {string} Today's date
 */
export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if form has changed from original.
 * @param {Object} current - Current form data
 * @param {Object} original - Original form data
 * @returns {boolean} True if anything changed
 */
export const hasFormChanged = (current, original) => {
  return JSON.stringify(current) !== JSON.stringify(original);
};

/**
 * Validate complete form.
 * @param {Object} formData - Form data object with title, author, meta
 * @returns {Object} { isValid: boolean, errors: { title?, author?, duration? } }
 */
export const validateForm = (formData) => {
  const errors = {};

  if (!isValidTitle(formData.title)) {
    errors.title = 'Title is required';
  }

  if (!isValidAuthor(formData.author)) {
    errors.author = 'Author is required';
  }

  if (formData.meta?.duration) {
    const durationValidation = validateDuration(formData.meta.duration);
    if (!durationValidation.isValid) {
      errors.duration = durationValidation.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Filter authors for autocomplete.
 * @param {string} query - Search query
 * @param {Array} allBooks - All books
 * @returns {Array} Filtered and sorted authors
 */
export const getFilteredAuthors = (query, allBooks) => {
  if (!query) return [];

  const q = query.toLowerCase();
  const authors = new Set(allBooks.map((b) => b.author).filter((a) => a && a.toLowerCase().includes(q)));

  return Array.from(authors).sort();
};

/**
 * Check if a title already exists in the book collection.
 * Detects duplicates by comparing normalized titles.
 * @param {string} newTitle - The new title to check
 * @param {Array} allBooks - All existing books
 * @param {string} currentBookKey - Optional: the _key of the book being edited (to allow same title on same book)
 * @returns {Object} { isDuplicate: boolean, error?: string }
 */
export const checkDuplicateTitle = (newTitle, allBooks, currentBookKey) => {
  const normalizedNewTitle = normalizeTitle(newTitle);
  const isDuplicate = allBooks.some((book) => book._key === normalizedNewTitle && book._key !== currentBookKey);

  return {
    isDuplicate,
    error: isDuplicate ? 'A book with this title already exists' : null,
  };
};
