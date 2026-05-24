# MyBooks Web - Project Context

## Overview

A simple Vue 3 web app to read/write book summaries stored in a JSON file on Dropbox. Weekly usage, plain-text editing, no offline requirement. Fully functional MVP with complete CRUD operations, table sorting/filtering, and Dropbox sync.

## Project Status: COMPLETE MVP ✅

**All core features implemented and working:**

- Full Dropbox OAuth authentication (PKCE flow)
- Complete book management (create, read, update, delete with undo)
- Advanced table view with sorting and 3-state filtering
- Details drawer (right-side panel)
- Edit form (fullscreen overlay) with validations
- Goodreads metadata import (fetch title, author, ISBN, pages, publication date)
- Toast notifications for success/delete events
- Dropbox sync for all operations

## Tech Stack

**Frontend:**

- Vue 3 with Single-File Components
- Vite (dev server on port 5173 with strictPort: true)
- Plain CSS with CSS variables for theming
- Custom table logic using Vue computed properties (not TanStack Table)

**Backend/Data:**

- Dropbox OAuth 2.0 with PKCE flow
- Official Dropbox SDK (`dropbox` npm package)
- Tokens stored in localStorage
- Source of truth: `mybooks.json` file on Dropbox (Map<String, Book>)

**Integrations:**

- Goodreads metadata extraction via page scraping + JSON-LD parsing
- CORS proxy (`api.codetabs.com`) for cross-origin fetches
- HTML entity decoding via `html-entities` npm package

**Testing:**

- Jest test runner
- Babel for ES module transpilation in Node.js
- 22 tests covering goodreads service (unit + integration)

## Data Structure

**Book object:**

```typescript
type Book = {
  title: string; // Display title
  author: string; // Author name
  date: string; // Read date (YYYY-MM, YYYY, or "?")
  dnf: boolean; // Did Not Finish flag
  notes: string; // User notes/summary (multi-line)
  meta?: BookMeta; // Optional metadata
};

type BookMeta = {
  GoodreadsID?: string;
  ISBN?: string;
  pubDate?: string; // Publication date (ISO_LOCAL_DATE)
  pages?: number;
  duration?: number; // Audiobook duration in minutes (presence = is audiobook)
};
```

**Key constraint:** Dropbox map key must be normalized title (exact Kotlin algorithm):

1. Lowercase
2. Remove diacritics (NFD normalization, strip marks)
3. Replace non-alphanumeric chars (except spaces) with spaces
4. Collapse multiple spaces into one
5. Trim

Example: "À Tue ... Et À Toi" → "a tue et a toi"

**In-app:** Books stored in Vue reactive array with `_key` property for normalized title.

## File Structure

```
src/
├── main.js                    # Vue app entry point
├── App.vue                    # Root component, auth state management
├── components/
│   ├── AuthScreen.vue         # Login/auth UI
│   ├── AuthCallback.vue       # OAuth redirect handler
│   ├── BookList.vue           # Main table view with filters/sort
│   ├── DetailsDrawer.vue      # Right-side read-only book details
│   ├── EditForm.vue           # Fullscreen edit/create form
│   └── GoodreadsModal.vue     # Modal dialog for Goodreads URL input
├── composables/
│   └── useDrag.js             # Touch/mouse drag gesture tracking for swipe interactions
└── services/
    ├── dropbox.js             # Dropbox API service layer
    └── goodreads.js           # Goodreads metadata extraction service
```

## Key Implementation Details

### BookList.vue (Main Table)

- **Columns:** Author, Title, Date, Duration, Pages, DNF, Actions (all sortable except Actions)
- **Sorting:** Click column header to toggle ascending/descending
  - Date sort special: extract digits only, handle non-standard dates like "??", "New Zealand"
  - Pages/Duration: treat null as 0
  - Author/Title/DNF: standard alphabetical
- **Filters:**
  - Global search: text input with dropdown to select which fields to search
    - "Anything": searches title, author, date, notes
    - "Title": searches only titles
    - "Author": searches only authors
    - "Title + Author": searches both fields
    - "Date": searches only dates
    - "Notes": searches only notes
  - **Desktop:** Search field selector, Format, and Status filters visible in one row
  - **Mobile:** Filters collapsible behind ☰ toggle button (hamburger icon)
    - Toggle button shows purple background when expanded
    - When collapsed: only search input visible
    - When expanded: search field selector, Format, and Status filters stack vertically
  - Format dropdown: All / Audiobook / Paper (based on meta.duration presence)
  - Status dropdown: All / Finished / DNF
  - **Mobile keyboard:** Pressing Enter/Search button on mobile keyboard closes keyboard (blur on `@keydown` and `@keyup` events, checks both `key === 'Enter'` and `keyCode === 13`)
- **Row count display:** Shows "filtered / total"
- **Audiobook highlighting:** Purple background for rows with duration
- **Row interactions:**
  - Click row → Opens DetailsDrawer
  - Click same row again → Closes drawer
  - Edit icon → Opens EditForm
  - Delete icon → Removes book, shows undo toast (5 sec auto-dismiss)

### EditForm.vue (Edit/Create)

- **Fields:** Title (required), Author (with autocomplete), Date, Notes, DNF checkbox, Metadata section
- **Validations:**
  - Title required and non-empty (trimmed)
  - Change detection: save only enabled if something actually changed
  - Duration format: `Xh` or `Xh:MM` (e.g., "7h34")
  - Date auto-formatting: pads months/days with zeros on blur
  - Author autocomplete: filtered list of existing authors
- **Notes field:** Textarea with auto-grow behavior, min-height 300px
  - **Fullscreen notes mode:** Press Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to toggle fullscreen modal
  - Expand button (⛶) next to Notes label to toggle fullscreen
  - Modal overlay with fullscreen textarea for distraction-free editing
  - Click outside modal or press shortcut again to close
- **localStorage auto-save:** Notes auto-save to localStorage (300ms debounce) for both new books and edits
  - Single localStorage key `mybooks_editform_draft` stores `{hash, notes}` dict
  - Hash ensures drafts only restore in matching form context (prevents cross-contamination)
  - Restores saved notes only if hash matches current form context
  - Clears localStorage on successful save or cancel
  - Prevents localStorage bloat (single entry, not one per book)
  - Preserves draft recovery on page refresh (combined with URL hash context)
- **Metadata:** Always visible (not collapsible), optional fields
- **Save button:** Shows "Saving..." state, uploads to Dropbox
- **Cancel button:** Prompts if unsaved changes
- **Error banner:** Displays at top if save fails
- **Date field:** Auto-filled with today's date when creating new book

### DetailsDrawer.vue (Read-only)

- 400px wide, full height, slides in from right with 0.15s animation
- Shows: title, author, date, duration, pages, DNF status, notes (scrollable), collapsible metadata
- Close button in header
- Edit button in footer
- Clicking another table row updates drawer without closing
- **Mobile gesture:** Swipe right to dismiss (threshold: 70px). Drawer follows finger in real-time and snaps back if threshold not met.

### dropbox.js (Service Layer)

- `downloadBooks()`: Fetches mybooks.json, returns Map<String, Book> or empty object for new users
- `uploadBooks(booksMap)`: Uploads entire books map to Dropbox as JSON
- Uses localStorage for token persistence
- PKCE flow with DropboxAuth helpers (`getAuthenticationUrl`, `getAccessTokenFromCode`)

### GoodreadsModal.vue (Metadata Import Dialog)

- Modal dialog triggered by "From Goodreads" button in EditForm header
- User enters Goodreads book URL
- Real-time validation against URL format (must contain `/book/show/`)
- Shows loading indicator while fetching
- Displays error messages if fetch fails
- Auto-closes on successful fetch

### goodreads.js (Goodreads Integration Service)

**Functions:**

- `validateUrl(url)`: Checks if URL is a valid Goodreads book detail page
- `fetchBookMetadata(url)`: Fetches and extracts metadata from Goodreads page
- `extractGoodreadsId(url)`: Extracts numeric book ID from URL
- `extractPublicationDate(html)`: Parses "First published" date from HTML

**Metadata Extracted:**

- `title`: Book title (HTML entities decoded)
- `author`: First author if multiple (HTML entities decoded)
- `isbn`: ISBN number
- `pages`: Page count (null if not available)
- `goodreadsId`: Goodreads book ID from URL
- `pubDate`: Publication date in ISO format YYYY-MM-DD (null if not found)

**Technical Details:**

- Uses CORS proxy (`api.codetabs.com`) to fetch Goodreads pages
- Parses JSON-LD structured data from page `<script type="application/ld+json">` block
- Searches HTML for "First published: Month Day, Year" pattern
- Decodes HTML entities (`&apos;`, `&quot;`, etc.) using `html-entities` package
- Comprehensive error handling with descriptive messages

**Tested via:**

- 22 unit tests (mocked Goodreads responses)
- 1 integration test (real Goodreads page fetch)

## Important Patterns & Decisions

### Reactive State Management

- `books` ref: array of book objects with `_key` property
- Filter refs: `dnfFilter`, `audiobookFilter`, `searchFieldsFilter`, `globalFilter`
- UI state: `filtersOpen` (mobile filters collapse toggle)
- Sort ref: `sorting` array with `{id, desc}` objects
- Selection: `selectedBook`, `drawerOpen`, `editFormOpen`

### Computed Properties

- `filteredAndSortedBooks`: applies all filters and sort, main reactive source for table

### Form State Handling

- `EditForm` uses `watch` with `immediate: true` to load book values
- Deep copy of original data to track changes
- Key prop on component to force remount when switching between edit/new

### Reactivity Gotchas Fixed

- Use `Object.assign(books.value[index], {...})` for in-place mutations to trigger reactivity
- Use `toRefs(props)` for proper prop destructuring in templates
- Use `nextTick()` before measuring DOM (e.g., textarea auto-grow)

### Undo Implementation

- Delete immediately removes from state and uploads to Dropbox
- Undo stores book in `undoData` ref with 5-second timeout
- If undo clicked, restores book and re-uploads to Dropbox

### Title Normalization

- Applied when saving new/renamed books to create the map key
- Must match Kotlin algorithm exactly (see implementation in BookList.vue `normalizeTitle` function)

### Gesture Interactions (Mobile)

- **useDrag composable** (`src/composables/useDrag.js`): Reusable Vue composable for touch drag tracking
  - Tracks touch start position, real-time movement, and release
  - Returns `dragOffset` (current drag distance), `isDragging` state, and event handlers
  - Configurable dismiss threshold (default 50px, currently 70px for DetailsDrawer)
  - Used by DetailsDrawer for swipe-to-dismiss; designed for row swipe actions (future)
- DetailsDrawer resets drag offset when opened/closed to prevent stale state

## CSS Variables (Theme)

```css
--bg-primary: #0a1123; /* Main background */
--bg-secondary: #1a2a3a; /* Cards/elevated surfaces */
--bg-hover: #2a3a4a; /* Hover state */
--text-primary: #f5f5f5; /* Main text */
--text-secondary: #a0a0a0; /* Muted text */
--accent-primary: #00d9ff; /* Cyan - buttons, highlights */
--accent-secondary: #a855f7; /* Purple - audiobook indicator */
--warning: #ff6b6b; /* Red - DNF, delete */
--success: #51cf66; /* Green - save success */
--border: #2a3a4a; /* Borders, dividers */
--shadow: rgba(0, 0, 0, 0.3); /* Shadows */
```

## Setup & Running

**Prerequisites:**

- Node.js v24+ (see `.nvmrc` for pinned version)
  - Recommended: Use [nvm](https://github.com/nvm-sh/nvm) to manage Node versions
  - Run `nvm install` to use the version specified in `.nvmrc`
  - Run `nvm use` before development (or add to shell profile for auto-activation)
- npm (comes with Node.js)
- Dropbox account
- Dropbox App with OAuth credentials

**Environment:**
Create `.secrets` file with:

```
VITE_DROPBOX_APP_KEY=your_app_key
VITE_DROPBOX_APP_SECRET=your_app_secret
```

**Dropbox App Configuration:**

- Create a Dropbox app at https://www.dropbox.com/developers/apps
- Set OAuth redirect URI to: `{your-domain}/auth-callback.html`
  - Local dev: `http://localhost:5173/auth-callback.html`
  - GitHub Pages: `https://username.github.io/mybooks-web/auth-callback.html`
  - Other hosts: `https://your-domain.com/auth-callback.html`
- The app automatically serves `/auth-callback.html` in dev mode via Vite middleware
- At build time, `vite-auth-callback-plugin.js` copies `index.html` to `auth-callback.html` in dist/

**Vite Configuration:**

- For local dev or custom domain: `base: '/'` (default)
- For GitHub Pages: Change `base: '/'` to `base: '/mybooks-web/'` (use your repo name)
- See `vite.config.js` for the setting

**Auth Callback Handling:**

- Vite plugin (`vite-auth-callback-plugin.js`) automatically handles OAuth callback
- In dev: serves `/auth-callback.html` the same as `/`
- In build: copies `index.html` to `auth-callback.html` in dist/
- No manual maintenance needed — stays in sync with index.html automatically

**Commands:**

```bash
# Set up Node.js version (if using nvm)
nvm install    # Install Node version from .nvmrc
nvm use        # Activate Node version for this shell

# Project setup and development
npm install
npm run dev        # Start dev server on http://localhost:5173
npm run build      # Build for production (outputs to dist/)
npm run preview    # Preview production build locally
npm run format     # Format code with Prettier
```

**Deployment to GitHub Pages:**

1. Set `base: '/mybooks-web/'` in vite.config.js
2. Update Dropbox app redirect URI to: `https://username.github.io/mybooks-web/auth-callback.html`
3. Build: `npm run build`
4. Push `dist/` folder to gh-pages branch
5. Enable GitHub Pages in repo settings (source: gh-pages branch)

## Known Limitations & Future Enhancements

**Not implemented (low priority):**

- Duplicate title detection/warning
- Real-time date field validation (auto-insert dashes while typing)
- Collapsible metadata section
- Resizable drawer
- Per-column text filters (Title search)
- Keyboard navigation shortcuts
- Accessibility improvements (ARIA labels, focus management)
- Goodreads integration (metadata fetching)

**Architecture decisions:**

- No offline mode: weekly usage, simplifies implementation
- No backend: Dropbox API called directly from frontend
- No database: JSON file is source of truth
- Custom table logic instead of TanStack Table: sufficient for ~300 books, avoids extra dependency
- Immediate delete with undo instead of confirmation: fast, undo is safety net

## URL Hash Navigation

Form context is preserved via URL hash for refresh resilience:

- `/#new` - Creating a new book
- `/#<book_key>` - Editing a specific book (e.g., `/#the-hobbit`)
- No hash - Showing book list (home view)

**Behavior:**

- Opening a form updates the URL hash automatically
- Closing a form clears the hash
- Page refresh restores the form with the same context (book or new mode)
- If editing a book that no longer exists, hash is cleared and user redirected to list
- localStorage auto-save for notes works with URL hash for complete recovery on refresh

**Example:**

1. Click "Add Book" → URL becomes `/#new`, form opens
2. Type notes and refresh page → Form reopens with notes intact (via localStorage)
3. Close form → URL hash clears, shows list
4. Click edit on a book → URL becomes `/#hobbit`, form opens with that book
5. Refresh page → Form reopens with same book context

## Workflow

1. **Login:** User connects Dropbox, gets OAuth token (stored in localStorage)
2. **Load:** App fetches mybooks.json on mount, populates books array, checks URL hash and restores form if needed
3. **Browse:** User views books in table, can sort/filter/search
4. **View Details:** Click row → opens DetailsDrawer
5. **Edit:** Click Edit icon or button → opens EditForm, updates URL hash to `/#<book_key>`
6. **New Book:** Click + button → opens EditForm for new book, updates URL hash to `/#new`
7. **Refresh:** Page refresh preserves form context via URL hash
8. **Save:** Form validates, uploads to Dropbox, updates table, clears URL hash
9. **Cancel:** Closes form, clears URL hash (localStorage already cleared)
10. **Delete:** Click Delete icon → removes from state, uploads, shows undo toast
11. **Undo:** Click undo button → restores book, re-uploads

## Testing Notes

- All features tested manually in browser
- Toast notifications auto-dismiss after 3-5 seconds
- Undo timeout is 5 seconds before auto-clearing
- App handles new users gracefully (creates empty state)
- Dropbox sync is required for all operations (no offline support)
- Table handles ~300 books smoothly with scrolling
- Date sorting handles non-standard dates ("??", "New Zealand") by treating as 0

## Code Formatting

All code must be formatted per Prettier configuration (`.prettierrc`). After edits, running `npm run format` should not change anything. Key rules:

- 2 spaces for indentation (no tabs)
- Single quotes for strings
- Semicolons required
- Trailing commas in ES5 contexts
- Line length: 120 characters (`printWidth: 120`)

This is enforced to keep diffs clean and reduce noise in git history.

## Important: Do Not Use TanStack Table

The original spec mentioned TanStack Table, but we implemented the table logic with Vue computed properties instead. This decision was made to avoid unnecessary complexity for our use case. If significant table features are needed in the future (multi-column sorting, column visibility, pagination), consider refactoring to TanStack Table at that time.
