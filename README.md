# MyBooks Web

A simple Vue 3 web app to read/write book summaries stored in Dropbox. Weekly usage, plain-text editing, no offline required.

## Features

- **Dropbox OAuth** with automatic token refresh (PKCE flow)
- **Full CRUD:** Create, read, update, delete with undo
- **Table view:** Sorting (all columns), filtering (search + format/status dropdowns)
- **Details drawer:** Right-side panel with swipe-to-dismiss on mobile
- **Edit form:** Fullscreen overlay with localStorage auto-save for drafts
- **Goodreads import:** Fetch title, author, ISBN, pages, publication date from Goodreads URLs
- **Toast notifications** for save/delete events
- **Mobile-responsive** with collapsible filters and touch gestures
- **Installable PWA** (home screen shortcut on Android)

## Setup

**Prerequisites:**

- Node.js v24+ (see `.nvmrc`)
- npm
- Dropbox account + app credentials

**Create `.secrets` file:**

```
VITE_DROPBOX_APP_KEY=your_key
VITE_DROPBOX_APP_SECRET=your_secret
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
npm test                # Run tests (Jest, ~1.5s)
npm run build           # Production build
npm run format          # Format code with Prettier
```

## Deployment to GitHub Pages

1. Update `vite.config.js`: `base: '/mybooks-web/'`
2. Update Dropbox app redirect URI to GitHub Pages URL
3. Run `npm run build`
4. Push `dist/` to `gh-pages` branch
5. Enable GitHub Pages in repo settings

## Project Structure

```
src/
├── main.js                  # Vue entry point
├── App.vue                  # Root component, auth state
├── components/              # Vue components
│   ├── AuthScreen.vue
│   ├── BookList.vue         # Main table
│   ├── EditForm.vue         # Form (create/edit)
│   ├── DetailsDrawer.vue    # Right-side panel
│   ├── BookFilters.vue      # Filter controls
│   └── GoodreadsModal.vue
├── composables/
│   └── useDrag.js           # Touch/mouse drag tracking
├── utils/
│   ├── books.js             # Data transformations
│   └── formatting.js        # Date/duration formatting
└── services/
    ├── dropbox.js           # Dropbox OAuth & API
    └── goodreads.js         # Goodreads metadata scraping
```

## Data Structure

Books stored on Dropbox as JSON Map with normalized title keys. Each book has:

- `title`, `author`, `date` (YYYY-MM, YYYY, or "?"), `dnf` (boolean), `notes`
- Optional `meta`: `goodreadsId`, `isbn`, `pubDate`, `pages`, `duration` (minutes)

See CLAUDE.md for title normalization algorithm (critical for key matching).

## Testing

Tests live alongside source files (`books.js` ↔ `books.test.js`).

Run with `npm test`. 217 unit tests covering utilities, Dropbox logic, filtering, validation, and gestures.

## Known Limitations

- No offline support (weekly usage, Dropbox required)
- Refresh tokens expire (~10 years), user logs out with no warning
- No conflict resolution UI (prevents concurrent edits, shows error)
- Custom table logic (no TanStack Table) — suitable for ~1000 books

See CLAUDE.md for architecture decisions and Vue reactivity gotchas.
