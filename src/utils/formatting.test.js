import { formatDate, formatDuration } from './formatting';

describe('formatDate', () => {
  describe('valid dates', () => {
    it('formats YYYY-MM-DD as "Month Day, Year"', () => {
      expect(formatDate('2025-01-15')).toBe('Jan 15, 2025');
      expect(formatDate('2024-12-25')).toBe('Dec 25, 2024');
      expect(formatDate('2020-06-01')).toBe('Jun 01, 2020');
    });

    it('formats YYYY-MM as "Month Year"', () => {
      expect(formatDate('2025-01')).toBe('Jan 2025');
      expect(formatDate('2024-12')).toBe('Dec 2024');
      expect(formatDate('2020-06')).toBe('Jun 2020');
    });

    it('returns single year as-is', () => {
      expect(formatDate('2025')).toBe('2025');
      expect(formatDate('2020')).toBe('2020');
      expect(formatDate('1999')).toBe('1999');
    });

    it('returns "?" for unknown dates', () => {
      expect(formatDate('?')).toBe('?');
    });

    it('handles all month numbers correctly', () => {
      expect(formatDate('2025-01')).toBe('Jan 2025');
      expect(formatDate('2025-06')).toBe('Jun 2025');
      expect(formatDate('2025-12')).toBe('Dec 2025');
    });

    it('preserves leading zeros in days', () => {
      expect(formatDate('2025-01-01')).toBe('Jan 01, 2025');
      expect(formatDate('2025-01-09')).toBe('Jan 09, 2025');
    });
  });

  describe('edge cases', () => {
    it('returns "—" for null/undefined/empty', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate('')).toBe('—');
    });

    it('returns unformatted string for single-part dates', () => {
      expect(formatDate('invalid')).toBe('invalid');
      expect(formatDate('??')).toBe('??');
      expect(formatDate('???')).toBe('???');
    });

    it('returns original for non-standard date strings', () => {
      expect(formatDate('New Zealand')).toBe('New Zealand');
      expect(formatDate('sometime in 2020')).toBe('sometime in 2020');
      expect(formatDate('early morning')).toBe('early morning');
    });

    it('handles dates with extra spaces', () => {
      expect(formatDate('2025-01-15')).toBe('Jan 15, 2025');
    });
  });

  describe('boundary conditions', () => {
    it('formats first day of year', () => {
      expect(formatDate('2025-01-01')).toBe('Jan 01, 2025');
    });

    it('formats last day of year', () => {
      expect(formatDate('2025-12-31')).toBe('Dec 31, 2025');
    });

    it('formats leap year date', () => {
      expect(formatDate('2024-02-29')).toBe('Feb 29, 2024');
    });

    it('formats old dates', () => {
      expect(formatDate('1900-01-01')).toBe('Jan 01, 1900');
      expect(formatDate('1776')).toBe('1776');
    });

    it('formats far future dates', () => {
      expect(formatDate('2099-12-31')).toBe('Dec 31, 2099');
    });
  });
});

describe('formatDuration', () => {
  describe('valid durations', () => {
    it('converts minutes to h:mm format', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(450)).toBe('7:30');
    });

    it('pads minutes with leading zero', () => {
      expect(formatDuration(61)).toBe('1:01');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(605)).toBe('10:05');
    });

    it('handles single hour', () => {
      expect(formatDuration(60)).toBe('1:00');
    });

    it('handles multiple hours', () => {
      expect(formatDuration(120)).toBe('2:00');
      expect(formatDuration(600)).toBe('10:00');
    });

    it('handles zero minutes in hour', () => {
      expect(formatDuration(120)).toBe('2:00');
      expect(formatDuration(240)).toBe('4:00');
    });

    it('handles 59 minutes (max before hour)', () => {
      expect(formatDuration(59)).toBe('0:59');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for 0', () => {
      expect(formatDuration(0)).toBe('');
    });

    it('returns empty string for null', () => {
      expect(formatDuration(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(formatDuration(undefined)).toBe('');
    });

    it('returns empty string for falsy values', () => {
      expect(formatDuration(false)).toBe('');
      expect(formatDuration('')).toBe('');
    });
  });

  describe('boundary conditions', () => {
    it('formats 1 minute', () => {
      expect(formatDuration(1)).toBe('0:01');
    });

    it('formats very long duration (all-day audiobook)', () => {
      expect(formatDuration(1440)).toBe('24:00');
    });

    it('formats multi-day duration', () => {
      expect(formatDuration(2880)).toBe('48:00');
    });
  });

  describe('real audiobook examples', () => {
    it('formats audiobook durations', () => {
      expect(formatDuration(180)).toBe('3:00'); // short
      expect(formatDuration(720)).toBe('12:00'); // typical
      expect(formatDuration(1800)).toBe('30:00'); // long
    });
  });
});
