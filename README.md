# optcg-auth-client

Typed browser client for the Poneglyph auth service.

```ts
import { createAuthClient } from "optcg-auth-client";

const auth = createAuthClient();
await auth.login({ username: "name", password: "password" });
const session = await auth.getSession();
await auth.logout();
```

Requests use `credentials: "include"` so the browser sends and receives the `auth.poneglyph.one` HTTP-only session cookie.

## API

- `buildAuthUrl(path, params?, options?)`
- `authFetch(path, params?, options?)`
- `authPost(path, body, options?)`
- `createAuthClient(options?)`
- `AuthClientError`

The default auth origin is `https://auth.poneglyph.one`. Pass `baseUrl` to target a local or preview auth service.
