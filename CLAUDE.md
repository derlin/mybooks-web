# MyBooks Web

A Vue 3 web app to read/write book summaries stored in a JSON file on Dropbox. Weekly usage, plain-text editing, no offline requirement.

## Development Principles

- **DRY:** Extract reused code into utilities and components. Three similar lines beats a premature abstraction.
- **Simplicity first:** Simplest solution that works is best. No over-engineering or "what if" features.
- **Security:** Validate at system boundaries (user input, external APIs). Avoid XSS/injection patterns. Prefer built-in framework features.
- **Code quality:** Follow best practices. Clear naming, minimize complexity, no premature optimization.
- **Update README.md:** Reflects current state. Update on every session when code changes or patterns shift. Stale docs are worse than no docs.

## Implementation Discipline

- **Audit before coding:** Review codebase for duplication before implementing. Extract duplicated logic (functions, filters, formatters) to utils/ and import everywhere.
- **Test quality:** Consolidate redundant tests. Don't test implementation details; focus on preventing regressions. Simple functions (<10 lines) need <5 tests.
- **Extract utilities:** Patterns appearing 3+ times or repetitive error handling belong in utils/ (e.g., localStorage wrappers, common filters).
- **Clear names over comments:** Rename confusing variables instead of documenting them. Avoid nested patterns like nested `nextTick()`; simplify the logic itself.
- **Clean up:** Remove unused dependencies, dead code, unclear variable names. Verify build excludes test files.

## Architecture

**Tech stack:** Vue 3 with Single-File Components, Vite, plain CSS, Dropbox OAuth (PKCE), Jest testing.

**Why these choices:**

- Custom table logic instead of TanStack Table: ~1000 book limit, avoids extra dependency
- Direct Dropbox API calls (no backend): weekly usage, simplifies implementation
- Immediate delete with undo instead of confirmation: UX speed, undo is safety net
- Tests alongside source (not `__tests__` dirs): easier navigation, closer to code

## Data Model

```typescript
type Book = {
  title: string; // Display title
  author: string;
  date: string; // YYYY-MM, YYYY, or "?"
  dnf: boolean; // Did Not Finish
  notes: string; // Multi-line user summary
  meta?: BookMeta;
};

type BookMeta = {
  goodreadsId?: string;
  isbn?: string;
  pubDate?: string; // ISO format
  pages?: number;
  duration?: number; // Minutes; presence = is audiobook
};
```

**Critical constraint:** Dropbox map key = normalized title (exact Kotlin algorithm):

1. Lowercase
2. Remove diacritics (NFD, strip marks)
3. Replace non-alphanumeric (except spaces) with spaces
4. Collapse multiple spaces, trim

Example: "À Tue ... Et À Toi" → "a tue et a toi"

Must match `normalizeTitle()` in BookList.vue exactly.

## Dropbox Integration

**Token management:**

- Stores `{accessToken, refreshToken, expiresAt}` in single localStorage key `dropbox_auth`
- Access tokens: ~4 hour expiry (Dropbox default)
- Refresh tokens: ~10 year lifetime, but will eventually expire
- Proactive refresh: Every API call checks expiration (5-min safety buffer), refreshes if needed
- Fallback 401: If API returns 401, refresh and retry once
- Token expiration → logs user out, triggers re-auth

**Concurrency control:**

- File revision (`rev`) stored in localStorage on download
- On tab visibility change: cheap metadata check, silently refetch if changed
- Before save/delete: check revision. If changed, reload books and block operation with error message
- Prevents data loss from concurrent edits across tabs without manual conflict resolution

**Serialization:** `uploadBooks()` explicitly serializes only approved fields (`title`, `author`, `date`, `dnf`, `notes`, `meta`). Any other properties (Vue internals, mutations) are excluded.

## Vue Reactivity Gotchas (Fixed)

- Mutations on array items: use `Object.assign(books.value[index], {...})` not direct assignment
- Prop destructuring: use `toRefs(props)` to maintain reactivity
- DOM measurements: call `nextTick()` before measuring (e.g., textarea auto-grow)

## Testing

**Convention:** Test files sit alongside source (e.g., `books.js` ↔ `books.test.js`), not in `__tests__`.

**Philosophy:**

- Test business logic and pure functions (utils, serialization, token expiry)
- Avoid testing framework internals or Vue reactivity
- 70-80% coverage on critical paths beats 100% everywhere
- Tests = regression prevention, not proof of correctness
- Tests live alongside the files: `my.js` -> `my.test.js`

**Run tests:** `npm test` (Jest, ~1.5s). Watch mode: `npm test -- --watch`

## Code Style

Format with Prettier (run `npm run format` after edits). Key rules:

- 2 spaces, no tabs
- Single quotes
- Semicolons
- Trailing commas in ES5
- 120 char line length

## Known Issues

**Refresh token expiration:** If user inactive for months/years, refresh token expires (~10 years). Logged out on next API call with no warning. Low priority (weekly usage), but consider better error messaging if this becomes real issue.

## Other

- Do NOT handle git, never commit yourself
