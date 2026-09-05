import { describe, expect, it } from 'vitest';
import { isIsbn, isIsbn13 } from './isbn';

describe('isIsbn13', () => {
  const valid = [
    '9780306406157',
    '9780545010221',
    '9782070368228',
    '9791029803314', // 979 prefix, no ISBN-10 equivalent
    '978-2-07-036822-8', // hyphenated
    '978 0 306 40615 7', // spaced
  ];
  it.each(valid)('accepts %s', (code) => {
    expect(isIsbn13(code)).toBe(true);
  });

  const invalid: [string, string][] = [
    ['9780306406158', 'bad check digit'],
    ['4006381333931', 'valid EAN-13 but not a book'],
    ['0306406152', 'ISBN-10, not 13'],
    ['978030640615', 'too short'],
    ['97803064061570', 'too long'],
    ['978a306406157', 'non-digit'],
    ['', 'empty'],
  ];
  it.each(invalid)('rejects %s (%s)', (code) => {
    expect(isIsbn13(code)).toBe(false);
  });
});

describe('isIsbn', () => {
  const valid = ['0306406152', '155860832X', '155860832x', '0-306-40615-2', '9780306406157'];
  it.each(valid)('accepts %s', (code) => {
    expect(isIsbn(code)).toBe(true);
  });

  const invalid = [
    '0306406153',
    '1558608321',
    '030640615',
    '4006381333931', // valid EAN-13 but not a book
    'not an isbn',
    '',
  ];
  it.each(invalid)('rejects %s', (code) => {
    expect(isIsbn(code)).toBe(false);
  });
});
