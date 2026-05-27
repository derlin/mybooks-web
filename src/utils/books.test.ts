// @ts-nocheck
import { normalizeTitle } from './books';

describe('normalizeTitle', () => {
  it('lowercases title', () => {
    expect(normalizeTitle('THE HOBBIT')).toBe('the hobbit');
  });

  it('removes diacritics', () => {
    expect(normalizeTitle('À Tue Et À Toi')).toBe('a tue et a toi');
    expect(normalizeTitle('Café')).toBe('cafe');
    expect(normalizeTitle('Naïve')).toBe('naive');
  });

  it('replaces non-alphanumeric chars with spaces', () => {
    expect(normalizeTitle("Harry Potter: The Philosopher's Stone")).toBe('harry potter the philosopher s stone');
    expect(normalizeTitle('2001: A Space Odyssey')).toBe('2001 a space odyssey');
  });

  it('collapses multiple spaces into one', () => {
    expect(normalizeTitle('the   hobbit')).toBe('the hobbit');
    expect(normalizeTitle('title  with   multiple    spaces')).toBe('title with multiple spaces');
  });

  it('trims leading/trailing spaces', () => {
    expect(normalizeTitle('  the hobbit  ')).toBe('the hobbit');
  });

  it('handles mixed case and special characters', () => {
    expect(normalizeTitle('ThE LoRd Of ThE RiNgS!!!')).toBe('the lord of the rings');
  });

  it('preserves numbers', () => {
    expect(normalizeTitle('1984')).toBe('1984');
    expect(normalizeTitle('The 39 Steps')).toBe('the 39 steps');
  });

  it('handles empty string', () => {
    expect(normalizeTitle('')).toBe('');
  });

  it('handles title with only spaces', () => {
    expect(normalizeTitle('   ')).toBe('');
  });

  it('handles complex unicode', () => {
    expect(normalizeTitle('José García')).toBe('jose garcia');
    expect(normalizeTitle('Napoléon Bonaparte')).toBe('napoleon bonaparte');
  });

  it('handles apostrophes and quotes', () => {
    expect(normalizeTitle("Don't Stop Believin'")).toBe('don t stop believin');
    expect(normalizeTitle('"Quoted Title"')).toBe('quoted title');
  });

  it('handles hyphens and dashes', () => {
    expect(normalizeTitle('Life-Changing Moment')).toBe('life changing moment');
    expect(normalizeTitle('Twenty—En Dashes')).toBe('twenty en dashes');
  });
});
