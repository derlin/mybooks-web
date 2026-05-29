import { Dropbox, DropboxAuth } from 'dropbox';
import type { Book } from '../types';
import * as env from '../env';
import { Storage } from '../utils/storage';

export type FileMetadata = {
  rev: string;
  fileContent?: string;
};

export interface IDropboxService {
  tryLogin(): Promise<boolean>;
  logout(): void;
  getAuthUrl(): Promise<string>;
  exchangeCodeForToken(code: string): Promise<void>;
  downloadFile(path: string): Promise<FileMetadata>;
  uploadFile(path: string, contents: Blob): Promise<FileMetadata>;
  getRevision(path: string): Promise<FileMetadata>;
}

type DropboxTokenAuth = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

const STORAGE_KEY_DROPBOX_AUTH = 'dropbox_auth';

export class DropboxService implements IDropboxService {
  private storage = new Storage();
  private dbx: Dropbox | null = null;

  private getDropboxAppKey(): string {
    const key = env.DROPBOX_APP_KEY;
    if (!key) {
      throw new Error('VITE_DROPBOX_APP_KEY environment variable is not set');
    }
    return key;
  }

  private getRedirectUri(): string {
    return `${window.location.origin}/auth-callback.html`;
  }

  private getAuth(): DropboxAuth {
    return new DropboxAuth({ clientId: this.getDropboxAppKey() });
  }

  private initDbx(token: string): void {
    if (!token) throw Error('Dropbox initialization requires a token');
    this.dbx = new Dropbox({ accessToken: token });
  }

  private getStoredAuth(): DropboxTokenAuth | null {
    return this.storage.loadJson(STORAGE_KEY_DROPBOX_AUTH);
  }

  private storeTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    const expiresAt = Date.now() + expiresIn * 1000;
    this.storage.saveJson(STORAGE_KEY_DROPBOX_AUTH, {
      accessToken,
      refreshToken,
      expiresAt,
    });
  }

  private isTokenExpired(): boolean {
    const auth = this.getStoredAuth();
    if (!auth?.expiresAt) return true;
    return Date.now() > auth.expiresAt - 5 * 60 * 1000;
  }

  private async refreshAccessToken(): Promise<void> {
    const auth = this.getStoredAuth();
    if (!auth?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const dbxAuth = this.getAuth();
    dbxAuth.setRefreshToken(auth.refreshToken);

    try {
      await dbxAuth.refreshAccessToken([]);
      const access_token: string = dbxAuth.getAccessToken();
      const expiresAt: Date | null = dbxAuth.getAccessTokenExpiresAt();
      const expiresIn = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 1000) : 3600;
      this.storeTokens(access_token, auth.refreshToken, expiresIn);
      this.initDbx(access_token);
    } catch (err: any) {
      this.storage.clear(STORAGE_KEY_DROPBOX_AUTH);
      throw new Error('Failed to refresh token');
    }
  }

  private async ensureTokenValid(): Promise<void> {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
  }

  private async getDbx(): Promise<Dropbox> {
    await this.ensureTokenValid();
    if (this.dbx) return this.dbx;
    throw Error('Dropbox is not initialized');
  }

  private async handleDropboxError<T>(retryFn: () => Promise<T>): Promise<T> {
    try {
      await this.refreshAccessToken();
      return await retryFn();
    } catch (err: any) {
      throw err;
    }
  }

  async tryLogin(): Promise<boolean> {
    const storedAuth = this.getStoredAuth();
    if (!storedAuth) return false;
    try {
      await this.ensureTokenValid();
      this.initDbx(storedAuth.accessToken);
      return true;
    } catch (err) {
      return false;
    }
  }

  logout(): void {
    this.dbx = null;
    this.storage.clear(STORAGE_KEY_DROPBOX_AUTH);
  }

  async getAuthUrl(): Promise<string> {
    const auth: any = this.getAuth();
    const authUrl = await auth.getAuthenticationUrl(
      this.getRedirectUri(),
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

  async exchangeCodeForToken(code: string): Promise<void> {
    const auth = this.getAuth();
    const codeVerifier = sessionStorage.getItem('dropbox_code_verifier');

    if (!codeVerifier) {
      throw new Error('Code verifier not found');
    }

    auth.setCodeVerifier(codeVerifier);

    try {
      const response: any = await auth.getAccessTokenFromCode(this.getRedirectUri(), code);
      const { access_token, refresh_token, expires_in } = response.result;
      this.storeTokens(access_token, refresh_token, expires_in);
      this.initDbx(access_token);
      sessionStorage.removeItem('dropbox_code_verifier');
    } catch (err: any) {
      throw new Error(err.error || 'Failed to exchange code for token');
    }
  }

  async downloadFile(path: string): Promise<FileMetadata> {
    try {
      const dbx = await this.getDbx();
      const metadata: any = await dbx.filesDownload({ path });
      const fileContent = await metadata.result.fileBlob.text();
      return {
        rev: metadata.result.rev,
        fileContent,
      };
    } catch (err: any) {
      if (err.status === 409 && err.error.error_summary?.includes('not_found')) {
        throw new Error('File not found');
      }
      if (err.status === 401) {
        return this.handleDropboxError(() => this.downloadFile(path));
      }
      throw err;
    }
  }

  async uploadFile(path: string, contents: Blob): Promise<FileMetadata> {
    try {
      const dbx = await this.getDbx();
      const metadata: any = await dbx.filesUpload({
        path,
        contents,
        mode: { '.tag': 'overwrite' },
      });
      return {
        rev: metadata.result.rev,
      };
    } catch (err: any) {
      if (err.status === 401) {
        return this.handleDropboxError(() => this.uploadFile(path, contents));
      }
      throw err;
    }
  }

  async getRevision(path: string): Promise<FileMetadata> {
    try {
      const dbx = await this.getDbx();
      const metadata: any = await dbx.filesGetMetadata({ path });
      return {
        rev: metadata.result.rev,
      };
    } catch (err: any) {
      if (err.status === 401) {
        return this.handleDropboxError(() => this.getRevision(path));
      }
      throw err;
    }
  }
}
