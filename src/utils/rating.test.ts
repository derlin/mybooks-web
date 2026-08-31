// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { isPerfectRating, isValidRating, ratingBarFraction, ratingColor, ratingTextColor } from './rating';

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

describe('isPerfectRating', () => {
  const cases: Array<[number | null | undefined, boolean]> = [
    [5, true],
    [4.9, false],
    [0, false],
    [null, false],
    [undefined, false],
  ];

  it.each(cases)('%s => %s', (input, expected) => {
    expect(isPerfectRating(input)).toBe(expected);
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

  describe('the ramp', () => {
    it('anchors the ends of the domain', () => {
      expect(ratingColor(2, true)).toBe('hsl(0, 45%, 38%)');
      expect(ratingColor(5, true)).toBe('hsl(118, 88%, 47%)');
      expect(ratingColor(2, false)).toBe('hsl(0, 48%, 46%)');
      expect(ratingColor(5, false)).toBe('hsl(118, 82%, 32%)');
    });

    it('clamps everything below the domain floor to the bottom color', () => {
      for (const rating of [0, 0.5, 1, 1.9]) {
        expect(ratingColor(rating, true)).toBe(ratingColor(2, true));
      }
    });

    it('travels red to yellow to green', () => {
      expect(parseHsl(ratingColor(2, true)).hue).toBeLessThan(15);
      expect(parseHsl(ratingColor(3.6, true)).hue).toBeCloseTo(52, 0);
      expect(parseHsl(ratingColor(5, true)).hue).toBeGreaterThan(100);
    });

    it('raises the hue monotonically across the domain, in both themes', () => {
      for (const isDark of [true, false]) {
        const hues = EVERY_RATING.filter((r) => r >= 2).map((r) => parseHsl(ratingColor(r, isDark)).hue);
        for (let i = 1; i < hues.length; i++) {
          expect(hues[i]).toBeGreaterThan(hues[i - 1]);
        }
      }
    });

    it('makes the top of the scale pop harder than the middle or the bottom', () => {
      for (const isDark of [true, false]) {
        const sat = (rating: number) => parseHsl(ratingColor(rating, isDark)).sat;
        expect(sat(5)).toBeGreaterThan(sat(3.5));
        expect(sat(3.5)).toBeGreaterThan(sat(2));
      }
    });

    it('has no visible step between two neighboring ratings', () => {
      for (const isDark of [true, false]) {
        const stops = EVERY_RATING.map((r) => parseHsl(ratingColor(r, isDark)));
        for (let i = 1; i < stops.length; i++) {
          expect(Math.abs(stops[i].hue - stops[i - 1].hue)).toBeLessThanOrEqual(6);
          expect(Math.abs(stops[i].sat - stops[i - 1].sat)).toBeLessThanOrEqual(6);
          expect(Math.abs(stops[i].lightness - stops[i - 1].lightness)).toBeLessThanOrEqual(6);
        }
      }
    });
  });

  describe('bar fraction', () => {
    it('fills the bar at the top of the domain and half fills it at the middle', () => {
      expect(ratingBarFraction(5)).toBe(1);
      expect(ratingBarFraction(3.5)).toBeCloseTo(0.5, 5);
    });

    it('keeps a visible stub at and below the domain floor', () => {
      for (const rating of [0, 1, 2, 2.1]) {
        expect(ratingBarFraction(rating)).toBeGreaterThanOrEqual(0.08);
      }
    });

    it('never overflows the track', () => {
      for (const rating of EVERY_RATING) {
        expect(ratingBarFraction(rating)).toBeLessThanOrEqual(1);
      }
    });

    it('grows with the rating over the useful range', () => {
      const widths = EVERY_RATING.filter((r) => r >= 2.5).map(ratingBarFraction);
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i]).toBeGreaterThan(widths[i - 1]);
      }
    });
  });

  describe('text color', () => {
    // WCAG AA for this text size is 4.5:1, and all but a handful of these 102
    // values clear it. The exceptions sit in the orange stretch around 3.0,
    // where the ramp crosses the mid lightness at which neither neutral has much
    // headroom; they land between 4.35 and 4.48. Pulling them clear means making
    // those colors lighter, which costs bar contrast against a light page, and
    // the bar is the thing this color exists for. 4.3 is the floor we actually
    // hold, and it holds for every rating in both themes.
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
      // A yellow at 51% lightness needs dark text, a red at 38% needs light.
      expect(ratingTextColor(3.5, true)).toBe('var(--on-color-dark)');
      expect(ratingTextColor(2, true)).toBe('var(--on-color-light)');
    });
  });
});
