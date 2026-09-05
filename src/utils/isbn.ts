// An ISBN-13 is an EAN-13 barcode whose GS1 prefix is 978 or 979 ("bookland"),
// which is why scanning a book cover is just an EAN-13 read plus these checks.

const cleanIsbn = (value: string): string => value.replace(/[\s-]/g, '').toUpperCase();

const isValidEan13 = (code: string): boolean => {
  if (!/^\d{13}$/.test(code)) return false;
  // Digits alternate weight 1 and 3, and the last digit makes the sum a multiple of 10.
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10 === Number(code[12]);
};

const isValidIsbn10 = (code: string): boolean => {
  if (!/^\d{9}[\dX]$/.test(code)) return false;
  // Weights run 10 down to 1, and the total must be a multiple of 11. The check
  // digit needs 11 values, hence X for 10.
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(code[i]) * (10 - i);
  }
  sum += code[9] === 'X' ? 10 : Number(code[9]);
  return sum % 11 === 0;
};

/**
 * Whether a scanned EAN-13 is a book. Guards against the two ways a scan goes
 * wrong: a non-book product (a 4006... grocery EAN) and a misread, which the
 * checksum catches most of the time.
 */
export const isIsbn13 = (code: string): boolean => {
  const cleaned = cleanIsbn(code);
  return (cleaned.startsWith('978') || cleaned.startsWith('979')) && isValidEan13(cleaned);
};

/** Accepts either ISBN form, hyphenated or not. */
export const isIsbn = (value: string): boolean => isValidIsbn10(cleanIsbn(value)) || isIsbn13(value);
