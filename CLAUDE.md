# MyBooks Web

A Vue 3 web app to read/write book summaries stored in a JSON file on Dropbox. Weekly usage, plain-text editing, no offline requirement.

## Development Principles

- **DRY:** Extract reused code into utilities and components. Three similar lines beats a premature abstraction.
- **Simplicity and Cleanliness:** The code must be as complex as necessary to allow maintainability, and as simple as it can. Find the right balance.
- **Security:** Validate at system boundaries (user input, external APIs). Avoid XSS/injection patterns. Prefer built-in framework features.
- **Code quality:** Follow best practices. Clear naming, minimize complexity, no premature optimization.
- **Seniority / Ownership**: You are a senior engineer, never blindly implement features, always raise your voice if you see a better way. You are expected to have a strong sense of ownership and responsibility for the codebase, behave as such.
- **Update README.md:** Reflects current state. Update on every session when code changes or patterns shift. Stale docs are worse than no docs.

## Implementation Discipline

- **Audit before coding:** Review codebase for duplication before implementing. Extract duplicated logic (functions, filters, formatters) to utils/ and import everywhere.
- **Test quality:** Consolidate redundant tests. Don't test implementation details; focus on preventing regressions. Simple functions (<10 lines) need <5 tests.
- **Extract utilities:** Patterns appearing 3+ times or repetitive error handling belong in utils/ (e.g., localStorage wrappers, common filters).
- **Clear names over comments:** Rename confusing variables instead of documenting them. Avoid nested patterns like nested `nextTick()`; simplify the logic itself.
- **Clean up:** Remove unused dependencies, dead code, unclear variable names. Verify build excludes test files.

## Architecture

**Tech stack:** Vue 3, Vite, Typescript, plain CSS, Dropbox OAuth (PKCE), Jest testing.

## Data Model

See `src/types.ts`

**Critical constraint:** Dropbox map key = normalized title (exact Kotlin algorithm):

1. Lowercase
2. Remove diacritics (NFD, strip marks)
3. Replace non-alphanumeric (except spaces) with spaces
4. Collapse multiple spaces, trim

Example: "À Tue ... Et À Toi" → "a tue et a toi"

Must match `normalizeTitle()` in BookTable.vue exactly.

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

## Utilities

After any change, ensure format, lint and test still work:

- Format with biome -> `biome.json`
- Test with vitest -> `npm run test`
- Lint with biome -> `npm run lint`

## Known Issues

**Refresh token expiration:** If user inactive for months/years, refresh token expires (~10 years). Logged out on next API call with no warning. Low priority (weekly usage), but consider better error messaging if this becomes real issue.

## Other

- Do NOT handle git, never commit yourself!
- Always ask if you are in doubt
