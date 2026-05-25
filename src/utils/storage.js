export function safeGetItem(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silent fail for localStorage errors (quota exceeded, private mode, etc)
  }
}

export function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silent fail for localStorage errors
  }
}
