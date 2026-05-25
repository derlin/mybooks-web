import { Dropbox, DropboxAuth } from 'dropbox';
import { serializeBooks } from '../utils/books';

let dbx = null;
let authExpiredCallback = null;

const DROPBOX_APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY;
const REDIRECT_URI = `${window.location.origin}/auth-callback.html`;

function getAuth() {
  return new DropboxAuth({
    clientId: DROPBOX_APP_KEY,
    redirectUri: REDIRECT_URI,
  });
}

export function initDropbox(token) {
  dbx = new Dropbox({
    accessToken: token,
  });
}

export function getDropbox() {
  return dbx;
}

export function getStoredToken() {
  const auth = getStoredAuth();
  return auth?.accessToken || null;
}

export function setAuthExpiredCallback(callback) {
  authExpiredCallback = callback;
}

export async function getAuthUrl() {
  const auth = getAuth();
  const authUrl = await auth.getAuthenticationUrl(
    REDIRECT_URI,
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

function storeTokens(accessToken, refreshToken, expiresIn) {
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

function storeFileRevision(rev) {
  localStorage.setItem('dropbox_file_rev', rev);
}

function getStoredFileRevision() {
  return localStorage.getItem('dropbox_file_rev');
}

function getStoredAuth() {
  const auth = localStorage.getItem('dropbox_auth');
  return auth ? JSON.parse(auth) : null;
}

export function isTokenExpired() {
  const auth = getStoredAuth();
  if (!auth?.expiresAt) return true;
  // Refresh if within 5 minutes of expiration
  return Date.now() > auth.expiresAt - 5 * 60 * 1000;
}

export async function exchangeCodeForToken(code) {
  const auth = getAuth();
  const codeVerifier = sessionStorage.getItem('dropbox_code_verifier');

  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }

  auth.setCodeVerifier(codeVerifier);

  try {
    const response = await auth.getAccessTokenFromCode(REDIRECT_URI, code);
    const { access_token, refresh_token, expires_in } = response.result;
    storeTokens(access_token, refresh_token, expires_in);
    sessionStorage.removeItem('dropbox_code_verifier');
    return access_token;
  } catch (err) {
    throw new Error(err.error || 'Failed to exchange code for token');
  }
}

export async function refreshAccessToken() {
  const auth = getStoredAuth();

  if (!auth?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const dbxAuth = getAuth();
  dbxAuth.setRefreshToken(auth.refreshToken);

  try {
    // SDK requires scope parameter; empty array means keep existing scopes
    await dbxAuth.refreshAccessToken([]);
    const access_token = dbxAuth.getAccessToken();
    const expiresAt = dbxAuth.getAccessTokenExpiresAt();
    const expiresIn = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 1000) : 3600;
    storeTokens(access_token, auth.refreshToken, expiresIn);
    initDropbox(access_token);
    return access_token;
  } catch (err) {
    // Refresh failed, clear tokens and trigger re-auth
    localStorage.removeItem('dropbox_auth');
    if (authExpiredCallback) {
      authExpiredCallback();
    }
    throw new Error('Failed to refresh token');
  }
}

async function ensureTokenValid() {
  if (isTokenExpired()) {
    await refreshAccessToken();
  }
}

async function handleDropboxError(err, retryFn) {
  try {
    await refreshAccessToken();
    return retryFn();
  } catch (refreshErr) {
    throw refreshErr;
  }
}

function requireDropbox() {
  if (!dbx) throw new Error('Dropbox not initialized');
}

export async function downloadBooks() {
  requireDropbox();

  try {
    await ensureTokenValid();
    const metadata = await dbx.filesDownload({ path: '/mybooks.json' });
    storeFileRevision(metadata.result.rev);
    const text = await metadata.result.fileBlob.text();
    return JSON.parse(text);
  } catch (err) {
    if (err.status === 409 && err.error.error_summary?.includes('not_found')) {
      return {};
    }
    if (err.status === 401) {
      return handleDropboxError(err, () => downloadBooks());
    }
    throw err;
  }
}

export async function checkFileRevision() {
  requireDropbox();

  try {
    await ensureTokenValid();
    const metadata = await dbx.filesGetMetadata({ path: '/mybooks.json' });
    const currentRev = metadata.result.rev;
    const storedRev = getStoredFileRevision();
    return currentRev !== storedRev;
  } catch (err) {
    if (err.status === 401) {
      return handleDropboxError(err, () => checkFileRevision());
    }
    // If file doesn't exist or other error, assume no conflict
    return false;
  }
}

export async function uploadBooks(booksData) {
  requireDropbox();

  const cleanedData = serializeBooks(booksData);

  const content = JSON.stringify(cleanedData, null, 2);
  try {
    await ensureTokenValid();
    const metadata = await dbx.filesUpload({
      path: '/mybooks.json',
      contents: new Blob([content], { type: 'application/json' }),
      mode: { '.tag': 'overwrite' },
    });
    storeFileRevision(metadata.result.rev);
  } catch (err) {
    if (err.status === 401) {
      return handleDropboxError(err, () => uploadBooks(booksData));
    }
    throw err;
  }
}
