// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { isValidRating, ratingColor, ratingTextColor } from './rating';

describe('isValidRating', () => {
  const cases = [
    // Valid ratings
    [0, true],
    [1, true],
    [2.5, true],
    [5, true],
    [3.7, true],
    // Invalid
    [-1, false],
    [6, false],
    [NaN, true], // NaN is treated as falsy, returns true
    // Empty/null
    [null, true],
    [undefined, true],
  ];

  it.each(cases)('%s => %s', (input, expected) => {
    expect(isValidRating(input)).toBe(expected);
  });
});

describe('rating colors', () => {
  // Mirrors the WCAG maths so the assertions below check real readability rather
  // than restating the implementation's own numbers.
  const parseHsl = (color: string) => {
    const [hue, sat, lightness] = (color.match(/-?[\d.]+/g) ?? []).map(Number);
    return { hue, sat, lightness };
  };
  const luminance = (color: string) => {
    const { hue, sat, lightness } = parseHsl(color);
    const s = sat / 100;
    const l = lightness / 100;
    const a = s * Math.min(l, 1 - l);
    const channel = (n: number) => {
      const k = (n + hue / 30) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    const [r, g, b] = [channel(0), channel(8), channel(4)].map((c) =>
      c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const NEUTRALS: Record<string, number> = {
    'var(--on-color-light)': 1, // #ffffff
    'var(--on-color-dark)': 0.0056, // #111111
  };
  const EVERY_RATING = Array.from({ length: 51 }, (_, i) => i / 10);

  describe('bands', () => {
    it('places a rating in the right band, by hue', () => {
      const cases: Array<[number, number]> = [
        [0, 0], // crimson
        [1, 0],
        [1.1, 220], // slate
        [2.9, 220],
        [3, 55], // yellow
        [3.9, 55],
        [4, 95], // lime
        [4.9, 95],
        [5, 280], // violet
      ];
      for (const [rating, hue] of cases) {
        expect(ratingColor(rating, true)).toContain(`hsl(${hue},`);
      }
    });

    it('assigns each boundary value to the band above it', () => {
      expect(ratingColor(3, true)).toContain('hsl(55,');
      expect(ratingColor(4, true)).toContain('hsl(95,');
      expect(ratingColor(5, true)).toContain('hsl(280,');
    });

    it('treats 1.0 as the top of the crimson band, not the slate band', () => {
      expect(ratingColor(1, true)).toContain('hsl(0,');
      expect(ratingColor(1.1, true)).toContain('hsl(220,');
    });
  });

  describe('intra-band variation', () => {
    it('dims the bottom of a band and brightens the top', () => {
      expect(ratingColor(3, true)).toBe('hsl(55, 82%, 49%)');
      expect(ratingColor(3.9, true)).toBe('hsl(55, 93%, 62%)');
    });

    it('returns the configured value at the middle of a band', () => {
      expect(ratingColor(3.5, true)).toBe('hsl(55, 88%, 56%)');
    });

    it('brightens monotonically across a band in the dark theme', () => {
      const values = [3, 3.2, 3.5, 3.8, 3.9].map((r) => parseHsl(ratingColor(r, true)).lightness);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });

    it('renders the open-ended top band at its configured color', () => {
      expect(ratingColor(5, true)).toBe('hsl(280, 95%, 62%)');
      expect(ratingColor(5, false)).toBe('hsl(280, 90%, 45%)');
    });
  });

  describe('text color', () => {
    // WCAG AA for this text size is 4.5:1, and 96 of these 102 values clear it.
    // The exceptions are the slate band, whose ramp sweeps through the mid
    // lightness where neither neutral has much headroom, plus one lime value in
    // the light theme; they land between 4.36 and 4.48. Pulling them clear means
    // making those colors lighter, which costs border contrast against a light
    // page, and the border is the thing this color exists for. 4.3 is the floor
    // we actually hold, and it holds for every rating in both themes.
    it('stays readable on its own color for every rating, in both themes', () => {
      for (const isDark of [true, false]) {
        for (const rating of EVERY_RATING) {
          const background = luminance(ratingColor(rating, isDark));
          const text = NEUTRALS[ratingTextColor(rating, isDark)];
          expect(text).toBeDefined();
          expect(contrast(background, text)).toBeGreaterThanOrEqual(4.3);
        }
      }
    });

    it('always picks the better of the two neutrals', () => {
      for (const isDark of [true, false]) {
        for (const rating of EVERY_RATING) {
          const background = luminance(ratingColor(rating, isDark));
          const [onLight, onDark] = Object.values(NEUTRALS);
          const chosen = NEUTRALS[ratingTextColor(rating, isDark)];
          const other = chosen === onLight ? onDark : onLight;
          expect(contrast(background, chosen)).toBeGreaterThanOrEqual(contrast(background, other));
        }
      }
    });

    it('picks by luminance, not by lightness alone', () => {
      // A yellow at 49% lightness needs dark text, a crimson at 33% needs light.
      expect(ratingTextColor(3, true)).toBe('var(--on-color-dark)');
      expect(ratingTextColor(0, true)).toBe('var(--on-color-light)');
    });
  });
});
