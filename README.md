# optcg-auth-client

Typed browser client for the Poneglyph auth service.

```ts
import { createAuthClient } from "optcg-auth-client";

const auth = createAuthClient();
await auth.login({ username: "name", password: "password" });
await auth.register({ username: "name", password: "password", email: null });
const session = await auth.getSession();
const library = await auth.getDeckLibrary();
await auth.syncDeckLibrary({ folders: [], decks: [] });
await auth.checkSimAccess("dev");
const handoff = await auth.createSimHandoff({ loadout_id: "loadout-id", environment: "dev" });
await auth.logout();
```

Requests use `credentials: "include"` so the browser sends and receives the `auth.poneglyph.one` HTTP-only session cookie.
Registration takes one user-facing name. The client sends that value as both `username` and the initial `display_name`; services normalize `username` for identity uniqueness.

Sim handoff verification is also exported for server-side match code:

```ts
import { verifySimHandoff } from "optcg-auth-client";

const verified = await verifySimHandoff(handoffToken);
```

## API

- `buildAuthUrl(path, params?, options?)`
- `authFetch(path, params?, options?)`
- `authPost(path, body, options?)`
- `authPut(path, body, options?)`
- `getDeckLibrary(options?)`
- `replaceDeckLibrary(input, options?)`
- `syncDeckLibrary(input, options?)`
- `checkSimAccess(environment, options?)`
- `createSimHandoff(input, options?)`
- `createSimHandoffs(input, options?)`
- `verifySimHandoff(token, options?)`
- `verifySimHandoffs(tokens, options?)`
- `createAuthClient(options?)`
- `AuthClientError`

The default auth origin is `https://auth.poneglyph.one`. Pass `baseUrl` to target a local or preview auth service.
