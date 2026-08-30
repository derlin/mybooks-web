export const isValidRating = (rating: number | null | undefined): boolean => {
  if (rating !== 0 && !rating) return true;
  const num = Number(rating);
  return !Number.isNaN(num) && num >= 0 && num <= 5;
};

// One color per rating, shared by the grid tile border and the rating pill so the
// two cannot drift apart. Bands rather than a continuous ramp: at a thin border
// width a 3.8 and a 5.0 on one hue scale look identical. Each theme needs its own
// numbers because the color has to stay legible against the page.
type RatingBand = {
  maxExclusive: number;
  hue: number;
  sat: { dark: number; light: number };
  lightness: { dark: number; light: number };
};

const RATING_BANDS: RatingBand[] = [
  // Horrible. Ratings carry one decimal, so 1.05 means "up to and including 1.0".
  { maxExclusive: 1.05, hue: 0, sat: { dark: 50, light: 50 }, lightness: { dark: 40, light: 45 } },
  // Meh
  { maxExclusive: 3.0, hue: 220, sat: { dark: 20, light: 25 }, lightness: { dark: 45, light: 55 } },
  // Decent. Hue 55 only reads as yellow while it stays light, so tone it down
  // through saturation, never lightness.
  { maxExclusive: 4.0, hue: 55, sat: { dark: 88, light: 85 }, lightness: { dark: 56, light: 40 } },
  // Good
  { maxExclusive: 5.0, hue: 95, sat: { dark: 75, light: 70 }, lightness: { dark: 48, light: 35 } },
  // Best ever
  {
    maxExclusive: Number.POSITIVE_INFINITY,
    hue: 280,
    sat: { dark: 95, light: 90 },
    lightness: { dark: 62, light: 45 },
  },
];

// Travel from one end of a band to the other, so a 3.0 is a dimmed 3.9. Zero for
// flat bands.
const INTRA_BAND_SAT_SPREAD = 12;
const INTRA_BAND_LIGHTNESS_SPREAD = 14;

const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

// A band's lower bound is the previous band's upper bound. `t` is the position
// within the band, 0 at the bottom edge and 1 at the top.
const ratingBandAt = (rating: number): { band: RatingBand; t: number } => {
  let min = 0;
  for (const band of RATING_BANDS) {
    if (rating < band.maxExclusive) {
      const span = band.maxExclusive - min;
      // The open ended top band has no position, so it sits at its middle.
      const t = Number.isFinite(span) ? Math.min(1, Math.max(0, (rating - min) / span)) : 0.5;
      return { band, t };
    }
    min = band.maxExclusive;
  }
  return { band: RATING_BANDS[RATING_BANDS.length - 1], t: 0.5 };
};

type Hsl = { hue: number; sat: number; lightness: number };

const ratingHsl = (rating: number, isDark: boolean): Hsl => {
  const { band, t } = ratingBandAt(rating);
  const mode = isDark ? 'dark' : 'light';
  const spread = (mid: number, amount: number) => mid - amount / 2 + amount * t;
  return {
    hue: band.hue,
    sat: clampPercent(spread(band.sat[mode], INTRA_BAND_SAT_SPREAD)),
    lightness: clampPercent(spread(band.lightness[mode], INTRA_BAND_LIGHTNESS_SPREAD)),
  };
};

const hslToRgb = ({ hue, sat, lightness }: Hsl): [number, number, number] => {
  const s = sat / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
};

const relativeLuminance = (hsl: Hsl): number => {
  const [r, g, b] = hslToRgb(hsl).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// --on-color-light (#ffffff) and --on-color-dark (#111111). Extremes on purpose:
// a band landing near 50% lightness has little headroom either way.
const ON_COLOR_LIGHT_LUMINANCE = 1;
const ON_COLOR_DARK_LUMINANCE = 0.0056;

export const ratingColor = (rating: number, isDark: boolean): string => {
  const { hue, sat, lightness } = ratingHsl(rating, isDark);
  return `hsl(${hue}, ${sat}%, ${lightness}%)`;
};

// Computed rather than stored per band: the winner depends on hue as much as
// lightness, and the intra-band ramp moves some bands across the crossover.
export const ratingTextColor = (rating: number, isDark: boolean): string => {
  const luminance = relativeLuminance(ratingHsl(rating, isDark));
  return contrast(luminance, ON_COLOR_LIGHT_LUMINANCE) >= contrast(luminance, ON_COLOR_DARK_LUMINANCE)
    ? 'var(--on-color-light)'
    : 'var(--on-color-dark)';
};
