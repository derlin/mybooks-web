export class Storage {
  private silentFail: boolean;

  constructor(options: { silentFail: boolean } = { silentFail: false }) {
    this.silentFail = options.silentFail;
  }

  save(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (!this.silentFail) throw e;
    }
  }

  load(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      if (!this.silentFail) throw e;
      return null;
    }
  }

  saveJson<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      if (!this.silentFail) throw e;
    }
  }

  loadJson<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      if (!this.silentFail) throw e;
      return null;
    }
  }

  clear(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      if (!this.silentFail) throw e;
    }
  }
}
