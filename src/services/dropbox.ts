import { Dropbox, DropboxAuth } from 'dropbox';
import type { Book } from '../types';
import * as env from '../env';

type DropboxTokenAuth = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

let _dbx: Dropbox | null = null;

function getDropboxAppKey(): string {
  const key = env.DROPBOX_APP_KEY;
  if (!key) {
    throw new Error('VITE_DROPBOX_APP_KEY environment variable is not set');
  }
  return key;
}

function getRedirectUri(): string {
  return `${window.location.origin}/auth-callback.html`;
}

async function getDbx(): Promise<Dropbox> {
  await ensureTokenValid();
  if (_dbx) return _dbx;
  throw Error('Dropbox is not initialized');
}

function setDbx(value: Dropbox | null): void {
  _dbx = value;
}

export function getAuth(): DropboxAuth {
  return new DropboxAuth({ clientId: getDropboxAppKey() });
}

function initDropbox(token: string): void {
  if (!token) throw Error('Dropbox initialization requires a token');
  setDbx(
    new Dropbox({
      accessToken: token,
    })
  );
}

export async function tryInitDropbox(): Promise<boolean> {
  const storedAuth = getStoredAuth();
  if (!storedAuth) return false;
  await ensureTokenValid();
  initDropbox(storedAuth.accessToken);
  return true;
}

export async function getAuthUrl(): Promise<string> {
  const auth: any = getAuth();
  const authUrl = await auth.getAuthenticationUrl(
    getRedirectUri(),
    undefined,
    'code',
    'offline',
    undefined,
    undefined,
    true
  );
  sessionStorage.setItem('dropbox_code_verifier', auth.codeVerifier);
  return authUrl;
}

function storeTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  const expiresAt = Date.now() + expiresIn * 1000;
  localStorage.setItem(
    'dropbox_auth',
    JSON.stringify({
      accessToken,
      refreshToken,
      expiresAt,
    })
  );
}

function storeFileRevision(rev: string): void {
  localStorage.setItem('dropbox_file_rev', rev);
}

export function getStoredFileRevision(): string | null {
  return localStorage.getItem('dropbox_file_rev');
}

export function getStoredAuth(): DropboxTokenAuth | null {
  const auth = localStorage.getItem('dropbox_auth');
  return auth ? JSON.parse(auth) : null;
}

export function isTokenExpired(): boolean {
  const auth = getStoredAuth();
  if (!auth?.expiresAt) return true;
  return Date.now() > auth.expiresAt - 5 * 60 * 1000;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const auth = getAuth();
  const codeVerifier = sessionStorage.getItem('dropbox_code_verifier');

  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }

  auth.setCodeVerifier(codeVerifier);

  try {
    const response: any = await auth.getAccessTokenFromCode(getRedirectUri(), code);
    const { access_token, refresh_token, expires_in } = response.result;
    storeTokens(access_token, refresh_token, expires_in);
    initDropbox(access_token);
    sessionStorage.removeItem('dropbox_code_verifier');
    return access_token;
  } catch (err: any) {
    throw new Error(err.error || 'Failed to exchange code for token');
  }
}

export async function refreshAccessToken(): Promise<string> {
  const auth = getStoredAuth();

  if (!auth?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const dbxAuth = getAuth();
  dbxAuth.setRefreshToken(auth.refreshToken);

  try {
    await dbxAuth.refreshAccessToken([]);
    const access_token: string = dbxAuth.getAccessToken();
    const expiresAt: Date | null = dbxAuth.getAccessTokenExpiresAt();
    const expiresIn = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 1000) : 3600;
    storeTokens(access_token, auth.refreshToken, expiresIn);
    initDropbox(access_token);
    return access_token;
  } catch (err: any) {
    localStorage.removeItem('dropbox_auth');
    throw new Error('Failed to refresh token');
  }
}

async function ensureTokenValid(): Promise<void> {
  if (isTokenExpired()) {
    await refreshAccessToken();
  }
}

async function handleDropboxError(_err: any, retryFn: () => Promise<any>): Promise<any> {
  try {
    await refreshAccessToken();
    return await retryFn();
  } catch (refreshErr: any) {
    throw refreshErr;
  }
}

// Utility: Convert Dropbox map format to typed Book array
function booksMapToArray(booksMap: Record<string, any>): Book[] {
  return Object.entries(booksMap).map(([key, book]) => ({
    ...(book as Omit<Book, '_key'>),
    _key: key,
  }));
}

// Utility: Clean books before upload (remove null values, validate structure)
function serializeBooks(books: Book[]): Record<string, any> {
  return Object.fromEntries(
    books.map(({ _key, meta, ...rest }) => {
      const serialized: any = rest;
      if (meta) {
        const cleanedMeta = Object.fromEntries(Object.entries(meta).filter(([, v]) => v != null));
        if (Object.keys(cleanedMeta).length > 0) {
          serialized.meta = cleanedMeta;
        }
      }
      return [_key, serialized];
    })
  );
}

export async function downloadBooks(): Promise<Book[]> {
  console.log('[Dropbox] Downloading books');
  try {
    const dbx = await getDbx();
    const metadata: any = await dbx.filesDownload({ path: '/mybooks.json' });
    storeFileRevision(metadata.result.rev);
    const text = await metadata.result.fileBlob.text();
    const booksMap = JSON.parse(text) as Record<string, any>;
    return booksMapToArray(booksMap);
  } catch (err: any) {
    if (err.status === 409 && err.error.error_summary?.includes('not_found')) {
      return []; // Return empty array for new users
    }
    if (err.status === 401) {
      return handleDropboxError(err, () => downloadBooks());
    }
    throw err;
  }
}

export async function checkFileRevision(): Promise<boolean> {
  console.log('[Dropbox] Checking file revision');

  try {
    const dbx = await getDbx();
    const metadata: any = await dbx.filesGetMetadata({ path: '/mybooks.json' });
    const currentRev = metadata.result.rev;
    const storedRev = getStoredFileRevision();
    return currentRev !== storedRev;
  } catch (err: any) {
    if (err.status === 401) {
      return handleDropboxError(err, () => checkFileRevision());
    }
    return false;
  }
}

export async function uploadBooks(books: Book[]): Promise<void> {
  console.log('[Dropbox] Uploading books');

  const cleanedData = serializeBooks(books);
  const content = JSON.stringify(cleanedData, null, 2);

  try {
    const dbx = await getDbx();
    const metadata: any = await dbx.filesUpload({
      path: '/mybooks.json',
      contents: new Blob([content], { type: 'application/json' }),
      mode: { '.tag': 'overwrite' },
    });
    storeFileRevision(metadata.result.rev);
  } catch (err: any) {
    if (err.status === 401) {
      return handleDropboxError(err, () => uploadBooks(books));
    }
    throw err;
  }
}

// Test utilities (exported for testing)
export const __testUtils = {
  setDbx,
  getDbx,
  getAuth,
  getStoredAuth,
};
