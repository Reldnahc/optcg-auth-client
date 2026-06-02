import test from "node:test";
import assert from "node:assert/strict";
import {
  AuthClientError,
  DEFAULT_AUTH_BASE_URL,
  authFetch,
  authPost,
  buildAuthUrl,
  createAuthClient,
} from "../dist/index.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("buildAuthUrl targets the production auth service by default", () => {
  assert.equal(DEFAULT_AUTH_BASE_URL, "https://auth.poneglyph.one");
  assert.equal(
    buildAuthUrl("/auth/session"),
    "https://auth.poneglyph.one/v1/auth/session",
  );
});

test("buildAuthUrl supports baseUrl overrides and query params", () => {
  assert.equal(
    buildAuthUrl("auth/session", { return_to: "/decks", empty: undefined }, { baseUrl: "http://localhost:3001/" }),
    "http://localhost:3001/v1/auth/session?return_to=%2Fdecks",
  );
});

test("authFetch includes browser credentials and parses JSON", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input, init });
    return Promise.resolve(jsonResponse({ data: { ok: true } }));
  };

  const body = await authFetch("/auth/session", undefined, { fetch: fetchImpl });

  assert.deepEqual(body, { data: { ok: true } });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.credentials, "include");
});

test("authPost sends JSON with browser credentials", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input, init });
    return Promise.resolve(jsonResponse({ data: { ok: true } }));
  };

  await authPost("/auth/logout", { reason: "test" }, { fetch: fetchImpl });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.credentials, "include");
  assert.equal(requests[0].init.headers["Content-Type"], "application/json");
  assert.equal(requests[0].init.body, JSON.stringify({ reason: "test" }));
});

test("auth requests throw typed errors with service messages", async () => {
  const fetchImpl = () => Promise.resolve(jsonResponse({
    error: { status: 401, message: "Invalid credentials" },
  }, 401));

  await assert.rejects(
    () => authPost("/auth/login", { username: "x", password: "bad" }, { fetch: fetchImpl }),
    (error) => {
      assert.equal(error instanceof AuthClientError, true);
      assert.equal(error.status, 401);
      assert.equal(error.message, "Invalid credentials");
      return true;
    },
  );
});

test("createAuthClient exposes typed auth endpoint helpers", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    if (String(input).endsWith("/v1/auth/session")) {
      return Promise.resolve(jsonResponse({
        data: {
          user: {
            id: "user-1",
            username: "tester",
            display_name: "Tester",
            email: "tester@example.com",
            email_verified: false,
          },
          session: {
            id: "session-1",
            expires_at: "2026-06-03T00:00:00.000Z",
          },
        },
      }));
    }

    return Promise.resolve(jsonResponse({
      data: {
        user: {
          id: "user-1",
          username: "tester",
          display_name: "Tester",
          email: "tester@example.com",
          email_verified: false,
        },
        session: {
          id: "session-1",
          expires_at: "2026-06-03T00:00:00.000Z",
        },
        token: "opaque-token",
      },
    }));
  };
  const client = createAuthClient({ baseUrl: "https://auth.example", fetch: fetchImpl });

  const login = await client.login({ username: "tester", password: "password" });
  const register = await client.register({
    username: "tester",
    display_name: "Tester",
    email: "tester@example.com",
    password: "password",
  });
  const session = await client.getSession();
  await client.logout();

  assert.equal(login.data.user.username, "tester");
  assert.equal(register.data.token, "opaque-token");
  assert.equal(session.data.session.id, "session-1");
  assert.deepEqual(
    requests.map((request) => request.input),
    [
      "https://auth.example/v1/auth/login",
      "https://auth.example/v1/auth/register",
      "https://auth.example/v1/auth/session",
      "https://auth.example/v1/auth/logout",
    ],
  );
  assert.equal(requests.every((request) => request.init.credentials === "include"), true);
});
