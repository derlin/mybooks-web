export const isValidRating = (rating: number | null | undefined): boolean => {
  if (rating !== 0 && !rating) return true;
  const num = Number(rating);
  return !Number.isNaN(num) && num >= 0 && num <= 5;
};

// Bar length and color are driven from the same domain, so the two channels can
// never disagree. It starts at 2 rather than 0 because almost nothing lands down
// there, and a 0-5 domain squeezes every rating actually in use into the top.
const DOMAIN_MIN = 2;
const DOMAIN_MAX = 5;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

// 0 at the bottom of the domain, 1 at the top. Clamped, so a 0.5 looks like a 2.
const domainPosition = (rating: number): number =>
  (clamp(rating, DOMAIN_MIN, DOMAIN_MAX) - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN);

// A rating at the domain floor still has to read as a bar, not an empty track.
const BAR_MIN_FRACTION = 0.08;

// 0 to 1, for the width of the rating bar under a grid tile. Length carries what
// hue cannot: a 3.2 and a 3.8 are all but the same color, but a fifth of the
// tile apart as bar widths.
export const ratingBarFraction = (rating: number): number => Math.max(BAR_MIN_FRACTION, domainPosition(rating));

// The top of the domain, which the grid frames rather than only coloring.
export const isPerfectRating = (rating: number | null | undefined): boolean => (rating ?? 0) >= DOMAIN_MAX;

// Red through yellow to green, shared by the bar and the rating pill so the two
// cannot drift apart. Saturation and lightness climb with the hue: the point is
// that a high rating pops and a low one stays quiet, which hue alone does not do.
//
// Stops rather than a straight hue sweep, because equal hue steps are not equal
// perceptual steps. Yellow only reads as yellow while it stays light, and each
// hue needs its own lightness per theme to hold up against the page.
type PerTheme = { dark: number; light: number };
type RatingStop = { at: number; hue: number; sat: PerTheme; lightness: PerTheme };

// Spans the domain exactly, so a clamped rating always falls between two stops.
const RATING_STOPS: RatingStop[] = [
  // Horrible: red, muted enough that it does not shout across the grid.
  { at: 2.0, hue: 0, sat: { dark: 45, light: 48 }, lightness: { dark: 38, light: 46 } },
  // Meh: orange.
  { at: 3.0, hue: 28, sat: { dark: 62, light: 64 }, lightness: { dark: 45, light: 43 } },
  // Decent: yellow.
  { at: 3.6, hue: 52, sat: { dark: 85, light: 84 }, lightness: { dark: 52, light: 40 } },
  // Good: yellow-green.
  { at: 4.3, hue: 82, sat: { dark: 80, light: 76 }, lightness: { dark: 49, light: 36 } },
  // Best ever: full green, the loudest thing on the page.
  { at: 5.0, hue: 118, sat: { dark: 88, light: 82 }, lightness: { dark: 47, light: 32 } },
];

type Hsl = { hue: number; sat: number; lightness: number };

const ratingHsl = (rating: number, isDark: boolean): Hsl => {
  const mode = isDark ? 'dark' : 'light';
  const value = clamp(rating, DOMAIN_MIN, DOMAIN_MAX);
  const upper = Math.max(
    1,
    RATING_STOPS.findIndex((stop) => stop.at >= value)
  );
  const from = RATING_STOPS[upper - 1];
  const to = RATING_STOPS[upper];
  const t = (value - from.at) / (to.at - from.at);
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  return {
    hue: lerp(from.hue, to.hue),
    sat: lerp(from.sat[mode], to.sat[mode]),
    lightness: lerp(from.lightness[mode], to.lightness[mode]),
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
// the ramp crosses 50% lightness, where neither neutral has much headroom.
const ON_COLOR_LIGHT_LUMINANCE = 1;
const ON_COLOR_DARK_LUMINANCE = 0.0056;

export const ratingColor = (rating: number, isDark: boolean): string => {
  const { hue, sat, lightness } = ratingHsl(rating, isDark);
  return `hsl(${hue}, ${sat}%, ${lightness}%)`;
};

// Computed rather than stored per stop: the winner depends on hue as much as
// lightness, and the ramp crosses the switchover point mid-stop.
export const ratingTextColor = (rating: number, isDark: boolean): string => {
  const luminance = relativeLuminance(ratingHsl(rating, isDark));
  return contrast(luminance, ON_COLOR_LIGHT_LUMINANCE) >= contrast(luminance, ON_COLOR_DARK_LUMINANCE)
    ? 'var(--on-color-light)'
    : 'var(--on-color-dark)';
};
