# MyBooks Web

A simple Vue 3 web app to read/write book summaries stored in Dropbox. Weekly usage, plain-text editing, no offline required.

## Features

- **Dropbox OAuth** with automatic token refresh (PKCE flow)
- **Full CRUD:** Create, read, update, delete with undo
- **Dual views:** Table (desktop, ≤768px) and card list (mobile, >768px) with explicit view switching
- **Theme control:** Light/dark/auto (system preference) with menu dropdown, persisted in localStorage
- **Sorting:** Table headers (desktop) and dropdown selector (mobile) — date/title, ascending/descending
- **Filtering:** Search + format/status dropdowns (both views)
- **Details drawer:** Right-side panel with swipe-to-dismiss on mobile
- **Edit form:** Fullscreen overlay with localStorage auto-save for drafts
- **Goodreads import:** Fetch title, author, ISBN, pages, publication date from Goodreads URLs
- **Toast notifications** for save/delete events
- **Download JSON:** Export books as JSON file from the menu (⋮)
- **Mobile-responsive** with collapsible filters and touch gestures
- **Installable PWA** (home screen shortcut on Android)

## Setup

**Prerequisites:**

- Node.js v24+ (see `.nvmrc`)
- npm
- Dropbox account + app credentials

**Create `.env` file:**

```
VITE_DROPBOX_APP_KEY=your_key
VITE_CORS_PROXY_URL=https://your-proxy.com?url=
```

**Dropbox App Setup:**

1. Create app at https://www.dropbox.com/developers/apps
2. Set OAuth redirect URI:
   - Local: `http://localhost:5173/auth-callback.html`
   - GitHub Pages: `https://username.github.io/mybooks-web/auth-callback.html`

**Install & Run:**

```bash
nvm install && nvm use  # Set Node version
npm install
npm run dev             # Dev server on http://localhost:5173
npm test                # Run tests (vitest, ~1.5s)
npm run build           # Production build
npm run format          # Format code with biome
npm run lint            # Lint code with biome
```

## Deployment to GitHub Pages

1. Update `vite.config.js`: `base: '/mybooks-web/'`
2. Update Dropbox app redirect URI to GitHub Pages URL
3. Run `npm run build`
4. Push `dist/` to `gh-pages` branch
5. Enable GitHub Pages in repo settings

## Data Structure

Books stored on Dropbox as JSON Map with normalized title keys. Each book has:

- `title`, `author`, `date` (YYYY-MM, YYYY, or "?"), `dnf` (boolean), `notes`
- Optional `meta`: `goodreadsId`, `isbn`, `pubDate`, `pages`, `duration` (minutes)

See CLAUDE.md for title normalization algorithm (critical for key matching).

## Testing & Linting

Tests live alongside source files (`books.js` ↔ `books.test.js`).
Run with `npm test`.

Linting and formatting use `biome` -> `npm run format` / `npm run lint`.

## Known Limitations

- No offline support (weekly usage, Dropbox required)
- Refresh tokens expire (~10 years), user logs out with no warning

See CLAUDE.md for architecture decisions and Vue reactivity gotchas.
