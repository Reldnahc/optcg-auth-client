import test from "node:test";
import assert from "node:assert/strict";
import {
  AuthClientError,
  DEFAULT_AUTH_BASE_URL,
  authFetch,
  authPost,
  buildAuthUrl,
  createAuthClient,
  createLoadoutFromDeckHash,
  createSimHandoff,
  verifySimHandoff,
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
    email: "tester@example.com",
    password: "password",
  });
  const session = await client.getSession();
  await client.logout();

  assert.equal(login.data.user.username, "tester");
  assert.equal(register.data.token, "opaque-token");
  assert.equal(session.data.session.id, "session-1");
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    username: "tester",
    password: "password",
    display_name: "tester",
    email: "tester@example.com",
  });
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

test("listLoadouts fetches account loadouts with browser credentials", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: [
        {
          id: "loadout-1",
          name: "Main Imu",
          main_deck_id: "deck-1",
          don_deck_id: null,
          playmat_id: "playmat-default",
          don_sleeve_id: "don-default",
          deck_sleeve_id: "deck-default",
          icon_id: "icon-default",
          updated_at: "2026-06-03T00:00:00.000Z",
        },
      ],
    }));
  };
  const client = createAuthClient({ baseUrl: "https://auth.example", fetch: fetchImpl });

  const response = await client.listLoadouts();

  assert.equal(response.data[0].name, "Main Imu");
  assert.deepEqual(
    requests.map((request) => request.input),
    ["https://auth.example/v1/loadouts"],
  );
  assert.equal(requests[0].init.credentials, "include");
});

test("createLoadoutFromDeckHash posts only the hash and name", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: {
        id: "loadout-1",
        name: "Imported deck",
        main_deck_id: "deck-1",
        don_deck_id: null,
        playmat_id: "playmat-default",
        don_sleeve_id: "don-default",
        deck_sleeve_id: "deck-default",
        icon_id: "icon-default",
        updated_at: "2026-06-03T00:00:00.000Z",
      },
    }));
  };
  const client = createAuthClient({ baseUrl: "https://auth.example", fetch: fetchImpl });

  const response = await createLoadoutFromDeckHash({
    name: "Imported deck",
    deck_hash: "hash-with-variants",
  }, { baseUrl: "https://auth.example", fetch: fetchImpl });
  const clientResponse = await client.createLoadoutFromDeckHash({
    name: "Imported deck",
    deck_hash: "hash-with-variants",
  });

  assert.equal(response.data.main_deck_id, "deck-1");
  assert.equal(clientResponse.data.main_deck_id, "deck-1");
  assert.deepEqual(
    requests.map((request) => request.input),
    [
      "https://auth.example/v1/loadouts/import-deck-hash",
      "https://auth.example/v1/loadouts/import-deck-hash",
    ],
  );
  assert.equal(requests.every((request) => request.init.method === "POST"), true);
  assert.equal(requests.every((request) => request.init.credentials === "include"), true);
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    name: "Imported deck",
    deck_hash: "hash-with-variants",
  });
  assert.equal(requests[0].init.body.includes('"deck"'), false);
});

test("resolveLoadout fetches the sim-facing resolved loadout package", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: {
        loadout_id: "loadout-1",
        user_id: "user-1",
        main_deck: {
          deck_id: "deck-1",
          hash: "deck-hash",
        },
        don_deck: {
          don_deck_id: null,
          payload: null,
        },
        cosmetics: {
          playmat_id: "playmat-default",
          don_sleeve_id: "don-default",
          deck_sleeve_id: "deck-default",
        },
      },
    }));
  };
  const client = createAuthClient({ baseUrl: "https://auth.example", fetch: fetchImpl });

  const response = await client.resolveLoadout("loadout-1");

  assert.equal(response.data.main_deck.hash, "deck-hash");
  assert.deepEqual(
    requests.map((request) => request.input),
    ["https://auth.example/v1/loadouts/loadout-1/resolve"],
  );
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.credentials, "include");
  assert.equal(requests[0].init.body, JSON.stringify({}));
});

test("createSimHandoff posts to the sim handoff endpoint", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: {
        token: "handoff-token",
        expires_at: "2026-06-02T18:00:00.000Z",
        resolved_loadout: {
          loadout_id: "loadout-1",
          user_id: "user-1",
          main_deck: {
            deck_id: "deck-1",
            hash: "deck-hash",
          },
          don_deck: {
            don_deck_id: null,
            payload: null,
          },
          cosmetics: {
            playmat_id: "playmat-default",
            don_sleeve_id: "don-default",
            deck_sleeve_id: "deck-default",
          },
        },
      },
    }));
  };

  const response = await createSimHandoff({
    loadout_id: "loadout-1",
    lobby_id: "lobby-1",
    seat_id: "p1",
  }, { baseUrl: "https://auth.example", fetch: fetchImpl });

  assert.equal(response.data.token, "handoff-token");
  assert.equal(response.data.resolved_loadout.main_deck.hash, "deck-hash");
  assert.deepEqual(
    requests.map((request) => request.input),
    ["https://auth.example/v1/sim/handoff"],
  );
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.credentials, "include");
  assert.equal(requests[0].init.body, JSON.stringify({
    loadout_id: "loadout-1",
    lobby_id: "lobby-1",
    seat_id: "p1",
  }));
});

test("verifySimHandoff posts token to the server verification endpoint", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: {
        claims: {
          jti: "token-id",
          sub: "user-1",
          sid: "session-1",
          loadout_id: "loadout-1",
          lobby_id: null,
          seat_id: "p1",
          aud: "optcg-sim",
          iat: 1780443000,
          exp: 1780443120,
        },
        resolved_loadout: {
          loadout_id: "loadout-1",
          user_id: "user-1",
          main_deck: {
            deck_id: "deck-1",
            hash: null,
          },
          don_deck: {
            don_deck_id: null,
            payload: null,
          },
          cosmetics: {
            playmat_id: "playmat-default",
            don_sleeve_id: "don-default",
            deck_sleeve_id: "deck-default",
          },
        },
      },
    }));
  };

  const response = await verifySimHandoff("handoff-token", {
    baseUrl: "https://auth.example",
    fetch: fetchImpl,
  });

  assert.equal(response.data.claims.aud, "optcg-sim");
  assert.equal(response.data.resolved_loadout.loadout_id, "loadout-1");
  assert.deepEqual(
    requests.map((request) => request.input),
    ["https://auth.example/v1/sim/handoff/verify"],
  );
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.body, JSON.stringify({ token: "handoff-token" }));
});

test("createAuthClient exposes sim handoff helpers", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: {
        token: "handoff-token",
        expires_at: "2026-06-02T18:00:00.000Z",
        resolved_loadout: {
          loadout_id: "loadout-1",
          user_id: "user-1",
          main_deck: {
            deck_id: "deck-1",
            hash: null,
          },
          don_deck: {
            don_deck_id: null,
            payload: null,
          },
          cosmetics: {
            playmat_id: "playmat-default",
            don_sleeve_id: "don-default",
            deck_sleeve_id: "deck-default",
          },
        },
        claims: {
          jti: "token-id",
          sub: "user-1",
          sid: "session-1",
          loadout_id: "loadout-1",
          lobby_id: null,
          seat_id: null,
          aud: "optcg-sim",
          iat: 1780443000,
          exp: 1780443120,
        },
      },
    }));
  };
  const client = createAuthClient({ baseUrl: "https://auth.example", fetch: fetchImpl });

  await client.createSimHandoff({ loadout_id: "loadout-1" });
  await client.verifySimHandoff("handoff-token");

  assert.deepEqual(
    requests.map((request) => request.input),
    [
      "https://auth.example/v1/sim/handoff",
      "https://auth.example/v1/sim/handoff/verify",
    ],
  );
});
