import test from "node:test";
import assert from "node:assert/strict";
import {
  AuthClientError,
  DEFAULT_AUTH_BASE_URL,
  authFetch,
  authPost,
  authPut,
  buildAuthUrl,
  createAuthClient,
  createLoadoutFromDeckHash,
  getDeckLibrary,
  replaceDeckLibrary,
  createSimHandoff,
  createSimHandoffs,
  syncDeckLibrary,
  updateProfileAvatar,
  updateProfileTitle,
  verifySimHandoff,
  verifySimHandoffs,
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

test("authPut sends JSON with browser credentials", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input, init });
    return Promise.resolve(jsonResponse({ data: { ok: true } }));
  };

  await authPut("/deck-library", { folders: [], decks: [] }, { fetch: fetchImpl });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.method, "PUT");
  assert.equal(requests[0].init.credentials, "include");
  assert.equal(requests[0].init.headers["Content-Type"], "application/json");
  assert.equal(requests[0].init.body, JSON.stringify({ folders: [], decks: [] }));
});

test("updateProfileAvatar puts avatar crop metadata", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: {
        user: {
          id: "user-1",
          username: "tester",
          display_name: "Tester",
          email: "tester@example.com",
          email_verified: false,
          profile: {
            avatar: {
              card_image_id: "image-1",
              image_source: "scan",
              image_url: "https://example.com/scan.png",
              crop: { x: 0.1, y: 0.2, size: 0.5 },
            },
            title: null,
          },
        },
      },
    }));
  };
  const input = {
    card_number: "OP01-001",
    language: "en",
    variant_index: 0,
    image_source: "scan",
    crop: { x: 0.1, y: 0.2, size: 0.5 },
  };
  const client = createAuthClient({ baseUrl: "https://auth.example", fetch: fetchImpl });

  const response = await updateProfileAvatar(input, { baseUrl: "https://auth.example", fetch: fetchImpl });
  const clientResponse = await client.updateProfileAvatar(input);

  assert.equal(response.data.user.profile.avatar.card_image_id, "image-1");
  assert.equal(clientResponse.data.user.profile.avatar.image_source, "scan");
  assert.deepEqual(
    requests.map((request) => request.input),
    [
      "https://auth.example/v1/me/profile/avatar",
      "https://auth.example/v1/me/profile/avatar",
    ],
  );
  assert.equal(requests.every((request) => request.init.method === "PUT"), true);
  assert.equal(requests.every((request) => request.init.credentials === "include"), true);
  assert.deepEqual(JSON.parse(requests[0].init.body), input);
});

test("updateProfileTitle puts selected title key", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: {
        user: {
          id: "user-1",
          username: "tester",
          display_name: "Tester",
          email: null,
          email_verified: false,
          profile: {
            avatar: null,
            title: {
              key: "pirate_rookie",
              label: "Pirate Rookie",
              style: { text_color: "#e8e9ed", animation: "none" },
            },
            unlocked_titles: [
              {
                key: "pirate_rookie",
                label: "Pirate Rookie",
                style: { text_color: "#e8e9ed", animation: "none" },
              },
            ],
          },
        },
      },
    }));
  };
  const client = createAuthClient({ baseUrl: "https://auth.example", fetch: fetchImpl });

  const response = await updateProfileTitle({ title_key: "pirate_rookie" }, { baseUrl: "https://auth.example", fetch: fetchImpl });
  const clientResponse = await client.updateProfileTitle({ title_key: null });

  assert.equal(response.data.user.profile.title.key, "pirate_rookie");
  assert.equal(clientResponse.data.user.profile.unlocked_titles[0].key, "pirate_rookie");
  assert.deepEqual(
    requests.map((request) => request.input),
    [
      "https://auth.example/v1/me/profile/title",
      "https://auth.example/v1/me/profile/title",
    ],
  );
  assert.equal(requests.every((request) => request.init.method === "PUT"), true);
  assert.equal(requests.every((request) => request.init.credentials === "include"), true);
  assert.deepEqual(JSON.parse(requests[0].init.body), { title_key: "pirate_rookie" });
  assert.deepEqual(JSON.parse(requests[1].init.body), { title_key: null });
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
            profile: {
              avatar: null,
              title: null,
            },
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
          profile: {
            avatar: null,
            title: null,
          },
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
          leader_card_number: "OP05-060",
          leader_variant_index: 1,
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
  assert.equal(response.data[0].leader_card_number, "OP05-060");
  assert.equal(response.data[0].leader_variant_index, 1);
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

test("deck library helpers target account library endpoints", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: {
        folders: [{
          id: "folder-1",
          user_id: "user-1",
          name: "Ranked",
          sort_order: 0,
          created_at: "2026-06-03T00:00:00.000Z",
          updated_at: "2026-06-03T00:00:00.000Z",
        }],
        decks: [{
          id: "deck-1",
          user_id: "user-1",
          name: "Red Luffy",
          deck_hash: "deck-hash",
          deck: null,
          folder_id: "folder-1",
          kind: "deck",
          leader_card_number: "OP01-003",
          leader_variant_index: 0,
          leader_crop_focus: { x: 0.42, y: 0.18 },
          leader_copy_count: 1,
          preview_card_number: "OP01-001",
          preview_variant_index: 0,
          max_copies_of_single_card: 4,
          main_count: 50,
          favorite: true,
          loadout_id: "loadout-1",
          don_deck_id: "don-1",
          playmat_cosmetic_id: "playmat-1",
          don_sleeve_cosmetic_id: "don-sleeve-1",
          deck_sleeve_cosmetic_id: "deck-sleeve-1",
          created_at: "2026-06-03T00:00:00.000Z",
          updated_at: "2026-06-03T00:00:00.000Z",
        }],
      },
    }));
  };
  const input = {
    folders: [{ id: "folder-1", name: "Ranked", sort_order: 0 }],
    decks: [{
      id: "deck-1",
      name: "Red Luffy",
      deck_hash: "deck-hash",
      folder_id: "folder-1",
      favorite: true,
      loadout_id: "loadout-1",
      don_deck_id: "don-1",
      playmat_cosmetic_id: "playmat-1",
      don_sleeve_cosmetic_id: "don-sleeve-1",
      deck_sleeve_cosmetic_id: "deck-sleeve-1",
    }],
  };
  const client = createAuthClient({ baseUrl: "https://auth.example", fetch: fetchImpl });

  const fetched = await getDeckLibrary({ baseUrl: "https://auth.example", fetch: fetchImpl });
  const replaced = await replaceDeckLibrary(input, { baseUrl: "https://auth.example", fetch: fetchImpl });
  const synced = await syncDeckLibrary(input, { baseUrl: "https://auth.example", fetch: fetchImpl });
  await client.getDeckLibrary();
  await client.replaceDeckLibrary(input);
  await client.syncDeckLibrary(input);

  assert.equal(fetched.data.decks[0].deck_hash, "deck-hash");
  assert.equal(fetched.data.decks[0].loadout_id, "loadout-1");
  assert.deepEqual(fetched.data.decks[0].leader_crop_focus, { x: 0.42, y: 0.18 });
  assert.equal(fetched.data.decks[0].deck_sleeve_cosmetic_id, "deck-sleeve-1");
  assert.equal(replaced.data.folders[0].name, "Ranked");
  assert.equal(synced.data.decks[0].deck, null);
  assert.deepEqual(
    requests.map((request) => request.input),
    [
      "https://auth.example/v1/deck-library",
      "https://auth.example/v1/deck-library",
      "https://auth.example/v1/deck-library/sync",
      "https://auth.example/v1/deck-library",
      "https://auth.example/v1/deck-library",
      "https://auth.example/v1/deck-library/sync",
    ],
  );
  assert.deepEqual(
    requests.map((request) => request.init.method ?? "GET"),
    ["GET", "PUT", "POST", "GET", "PUT", "POST"],
  );
  assert.equal(requests.every((request) => request.init.credentials === "include"), true);
  assert.equal(requests[1].init.body.includes('"deck_hash":"deck-hash"'), true);
  assert.equal(requests[1].init.body.includes('"loadout_id":"loadout-1"'), true);
  assert.equal(requests[1].init.body.includes('"deck_sleeve_cosmetic_id":"deck-sleeve-1"'), true);
  assert.equal(requests[1].init.body.includes('"deck"'), false);
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

test("createSimHandoffs posts loadout ids to the batch sim handoff endpoint", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: {
        handoffs: [
          {
            loadout_id: "loadout-1",
            status: "created",
            token: "handoff-token-1",
            expires_at: "2026-06-02T18:00:00.000Z",
          },
          {
            loadout_id: "loadout-2",
            status: "rejected",
            error: {
              status: 403,
              message: "Saved deck hash is required for sim handoff.",
            },
          },
        ],
      },
    }));
  };

  const response = await createSimHandoffs({
    loadout_ids: ["loadout-1", "loadout-2"],
    lobby_id: "lobby-1",
    seat_id: null,
  }, { baseUrl: "https://auth.example", fetch: fetchImpl });

  assert.equal(response.data.handoffs[0].token, "handoff-token-1");
  assert.equal(response.data.handoffs[1].status, "rejected");
  assert.deepEqual(
    requests.map((request) => request.input),
    ["https://auth.example/v1/sim/handoffs"],
  );
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.credentials, "include");
  assert.equal(requests[0].init.body, JSON.stringify({
    loadout_ids: ["loadout-1", "loadout-2"],
    lobby_id: "lobby-1",
    seat_id: null,
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

test("verifySimHandoffs posts tokens to the batch server verification endpoint", async () => {
  const requests = [];
  const fetchImpl = (input, init) => {
    requests.push({ input: String(input), init });
    return Promise.resolve(jsonResponse({
      data: {
        handoffs: [
          {
            status: "verified",
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
          {
            status: "rejected",
            error: {
              status: 401,
              message: "Invalid sim handoff token",
            },
          },
        ],
      },
    }));
  };

  const response = await verifySimHandoffs(["handoff-token-1", "bad-token"], {
    baseUrl: "https://auth.example",
    fetch: fetchImpl,
  });

  assert.equal(response.data.handoffs[0].resolved_loadout.main_deck.hash, "deck-hash");
  assert.equal(response.data.handoffs[1].status, "rejected");
  assert.deepEqual(
    requests.map((request) => request.input),
    ["https://auth.example/v1/sim/handoffs/verify"],
  );
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.body, JSON.stringify({
    tokens: ["handoff-token-1", "bad-token"],
  }));
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
  await client.createSimHandoffs({ loadout_ids: ["loadout-1"] });
  await client.verifySimHandoff("handoff-token");
  await client.verifySimHandoffs(["handoff-token"]);

  assert.deepEqual(
    requests.map((request) => request.input),
    [
      "https://auth.example/v1/sim/handoff",
      "https://auth.example/v1/sim/handoffs",
      "https://auth.example/v1/sim/handoff/verify",
      "https://auth.example/v1/sim/handoffs/verify",
    ],
  );
});
