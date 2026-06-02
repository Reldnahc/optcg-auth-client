# optcg-auth-client

TypeScript browser/client package for Poneglyph auth API calls.

## Rules
- Keep this package public-safe: no secrets, server internals, password hashing, session-token generation, DB access, or deployment credentials.
- Keep runtime dependencies minimal. Prefer platform `fetch` and TypeScript types over framework-specific code.
- Preserve cookie-backed browser auth by defaulting auth requests to `credentials: "include"`.
- Run `npm test` before publishing or consuming changes.
