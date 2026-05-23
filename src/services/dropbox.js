import { Dropbox, DropboxAuth } from 'dropbox';

let dbx = null;

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
  return localStorage.getItem('dropbox_token');
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

export async function exchangeCodeForToken(code) {
  const auth = getAuth();
  const codeVerifier = sessionStorage.getItem('dropbox_code_verifier');

  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }

  auth.setCodeVerifier(codeVerifier);

  try {
    const response = await auth.getAccessTokenFromCode(REDIRECT_URI, code);
    const token = response.result.access_token;
    localStorage.setItem('dropbox_token', token);
    sessionStorage.removeItem('dropbox_code_verifier');
    return token;
  } catch (err) {
    throw new Error(err.error || 'Failed to exchange code for token');
  }
}

export async function downloadBooks() {
  if (!dbx) throw new Error('Dropbox not initialized');

  try {
    const metadata = await dbx.filesDownload({ path: '/mybooks.json' });
    const text = await metadata.result.fileBlob.text();
    return JSON.parse(text);
  } catch (err) {
    if (err.status === 409 && err.error.error_summary?.includes('not_found')) {
      return {};
    }
    throw err;
  }
}

export async function uploadBooks(booksData) {
  if (!dbx) throw new Error('Dropbox not initialized');

  const content = JSON.stringify(booksData, null, 2);
  await dbx.filesUpload({
    path: '/mybooks.json',
    contents: new Blob([content], { type: 'application/json' }),
    mode: { '.tag': 'overwrite' },
  });
}
