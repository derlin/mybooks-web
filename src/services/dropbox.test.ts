// @ts-nocheck
// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock window.location for redirect URI
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
    location: { origin: 'http://localhost:5173' },
  },
  writable: true,
});

jest.mock('../env', () => ({
  DROPBOX_APP_KEY: 'test-app-key',
}));
jest.mock('dropbox');

describe('Dropbox Service', () => {
  let dropboxService: any;

  beforeAll(() => {
    dropboxService = require('./dropbox');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
    // Mock getAuth to avoid accessing import.meta.env
    jest.spyOn(dropboxService, 'getAuth').mockReturnValue({
      getAuthenticationUrl: jest.fn(),
      setCodeVerifier: jest.fn(),
      setRefreshToken: jest.fn(),
      getAccessToken: jest.fn(),
      getAccessTokenExpiresAt: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isTokenExpired()', () => {
    it('returns true when no token stored', () => {
      expect(dropboxService.isTokenExpired()).toBe(true);
    });

    it('returns true when token is expired', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      const expiresAt = now - 1000;

      localStorage.setItem(
        'dropbox_auth',
        JSON.stringify({ accessToken: 'token', refreshToken: 'refresh', expiresAt })
      );

      expect(dropboxService.isTokenExpired()).toBe(true);
    });

    it('returns true when within 5-minute safety buffer', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      const expiresAt = now + 4 * 60 * 1000;

      localStorage.setItem(
        'dropbox_auth',
        JSON.stringify({ accessToken: 'token', refreshToken: 'refresh', expiresAt })
      );

      expect(dropboxService.isTokenExpired()).toBe(true);
    });

    it('returns false when token is valid beyond safety buffer', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      const expiresAt = now + 10 * 60 * 1000;

      localStorage.setItem(
        'dropbox_auth',
        JSON.stringify({ accessToken: 'token', refreshToken: 'refresh', expiresAt })
      );

      expect(dropboxService.isTokenExpired()).toBe(false);
    });

    it('returns true when expiresAt missing', () => {
      localStorage.setItem('dropbox_auth', JSON.stringify({ accessToken: 'token' }));
      expect(dropboxService.isTokenExpired()).toBe(true);
    });
  });

  describe('getStoredFileRevision()', () => {
    it('returns stored revision', () => {
      localStorage.setItem('dropbox_file_rev', 'rev-123');
      expect(dropboxService.getStoredFileRevision()).toBe('rev-123');
    });

    it('returns null when not stored', () => {
      expect(dropboxService.getStoredFileRevision()).toBeNull();
    });
  });

  describe('checkFileRevision()', () => {
    it('returns false when revisions match', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      localStorage.setItem(
        'dropbox_auth',
        JSON.stringify({ accessToken: 'token', refreshToken: 'refresh', expiresAt: now + 1000000 })
      );
      localStorage.setItem('dropbox_file_rev', 'rev-123');

      dropboxService.__testUtils.setDbx({
        filesGetMetadata: jest.fn().mockResolvedValue({ result: { rev: 'rev-123' } }),
      });

      const hasConflict = await dropboxService.checkFileRevision();
      expect(hasConflict).toBe(false);
    });

    it('returns true when revisions differ', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      localStorage.setItem(
        'dropbox_auth',
        JSON.stringify({ accessToken: 'token', refreshToken: 'refresh', expiresAt: now + 1000000 })
      );
      localStorage.setItem('dropbox_file_rev', 'rev-old');

      dropboxService.__testUtils.setDbx({
        filesGetMetadata: jest.fn().mockResolvedValue({ result: { rev: 'rev-new' } }),
      });

      const hasConflict = await dropboxService.checkFileRevision();
      expect(hasConflict).toBe(true);
    });

    it('returns false on 409 error (file not found)', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      localStorage.setItem(
        'dropbox_auth',
        JSON.stringify({ accessToken: 'token', refreshToken: 'refresh', expiresAt: now + 1000000 })
      );

      dropboxService.__testUtils.setDbx({
        filesGetMetadata: jest.fn().mockRejectedValue({ status: 409, error: { error_summary: 'path/not_found' } }),
      });

      const hasConflict = await dropboxService.checkFileRevision();
      expect(hasConflict).toBe(false);
    });

    it('returns false on other errors', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      localStorage.setItem(
        'dropbox_auth',
        JSON.stringify({ accessToken: 'token', refreshToken: 'refresh', expiresAt: now + 1000000 })
      );

      dropboxService.__testUtils.setDbx({
        filesGetMetadata: jest.fn().mockRejectedValue({ status: 500, message: 'Server error' }),
      });

      const hasConflict = await dropboxService.checkFileRevision();
      expect(hasConflict).toBe(false);
    });
  });
});
