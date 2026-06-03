export const DEFAULT_AUTH_BASE_URL = "https://auth.poneglyph.one";

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export type AuthFetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type AuthClientOptions = {
  baseUrl?: string;
  fetch?: AuthFetchImplementation;
};

export type AuthRequestOptions = AuthClientOptions & {
  signal?: AbortSignal;
};

export type AuthUser = {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  email_verified: boolean;
};

export type AuthSession = {
  id: string;
  expires_at: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

export type RegisterInput = {
  username: string;
  password: string;
  email?: string | null;
};

type RegisterPayload = RegisterInput & {
  display_name: string;
};

export type AuthResponse = {
  data: {
    user: AuthUser;
    session: AuthSession;
    token: string;
  };
};

export type AuthSessionResponse = {
  data: {
    user: AuthUser;
    session: AuthSession;
  };
};

export type LogoutResponse = {
  data: {
    ok: true;
  };
};

export type Loadout = {
  id: string;
  name: string;
  main_deck_id: string;
  don_deck_id: string | null;
  playmat_id: string;
  don_sleeve_id: string;
  deck_sleeve_id: string;
  icon_id: string;
  updated_at: string;
};

export type LoadoutListResponse = {
  data: Loadout[];
};

export type CreateSimHandoffInput = {
  loadout_id: string;
  lobby_id?: string | null;
  seat_id?: string | null;
};

export type ResolvedSimLoadout = {
  loadout_id: string;
  user_id: string;
  main_deck: {
    deck_id: string;
    hash: string;
  };
  don_deck: {
    don_deck_id: string | null;
    payload: Record<string, unknown> | null;
  };
  cosmetics: {
    playmat_id: string;
    don_sleeve_id: string;
    deck_sleeve_id: string;
  };
};

export type SimHandoffClaims = {
  jti: string;
  sub: string;
  sid: string;
  loadout_id: string;
  lobby_id: string | null;
  seat_id: string | null;
  aud: "optcg-sim";
  iat: number;
  exp: number;
};

export type SimHandoffResponse = {
  data: {
    token: string;
    expires_at: string;
    resolved_loadout: ResolvedSimLoadout;
  };
};

export type ResolvedLoadoutResponse = {
  data: ResolvedSimLoadout;
};

export type SimHandoffVerifyResponse = {
  data: {
    claims: SimHandoffClaims;
    resolved_loadout: ResolvedSimLoadout;
  };
};

export class AuthClientError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "AuthClientError";
    this.status = status;
    this.body = body;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function parseJsonText(text: string): unknown {
  return JSON.parse(text) as unknown;
}

function extractErrorMessage(body: unknown): string | null {
  if (!isRecord(body)) return null;

  const error = body.error;
  if (isRecord(error)) {
    const nestedMessage = readStringField(error, "message");
    if (nestedMessage) return nestedMessage;
  }

  return readStringField(body, "message");
}

function resolveFetch(fetchImpl?: AuthFetchImplementation): AuthFetchImplementation {
  if (fetchImpl) return fetchImpl;
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error("No fetch implementation is available");
}

async function readJsonBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  return (text ? parseJsonText(text) : undefined) as T;
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  options: AuthRequestOptions = {},
): Promise<T> {
  const fetchImpl = resolveFetch(options.fetch);
  const response = await fetchImpl(url, {
    ...init,
    credentials: "include",
    signal: options.signal,
  });
  const body = await readJsonBody<unknown>(response);

  if (!response.ok) {
    throw new AuthClientError(
      response.status,
      extractErrorMessage(body) ?? `Auth API error ${response.status}`,
      body,
    );
  }

  return body as T;
}

export function buildAuthUrl(
  path: string,
  params?: QueryParams,
  options: Pick<AuthClientOptions, "baseUrl"> = {},
) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = (options.baseUrl ?? DEFAULT_AUTH_BASE_URL).replace(/\/+$/, "");
  const url = new URL(`/v1${normalizedPath}`, `${origin}/`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function authFetch<T>(
  path: string,
  params?: QueryParams,
  options: AuthRequestOptions = {},
) {
  return requestJson<T>(buildAuthUrl(path, params, options), {}, options);
}

export async function authPost<T>(
  path: string,
  body: unknown,
  options: AuthRequestOptions = {},
) {
  return requestJson<T>(
    buildAuthUrl(path, undefined, options),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    options,
  );
}

export function createSimHandoff(
  input: CreateSimHandoffInput,
  options: AuthRequestOptions = {},
) {
  return authPost<SimHandoffResponse>("/sim/handoff", input, options);
}

export function listLoadouts(options: AuthRequestOptions = {}) {
  return authFetch<LoadoutListResponse>("/loadouts", undefined, options);
}

export function resolveLoadout(
  loadoutId: string,
  options: AuthRequestOptions = {},
) {
  return authPost<ResolvedLoadoutResponse>(
    `/loadouts/${encodeURIComponent(loadoutId)}/resolve`,
    {},
    options,
  );
}

export function verifySimHandoff(
  token: string,
  options: AuthRequestOptions = {},
) {
  return authPost<SimHandoffVerifyResponse>("/sim/handoff/verify", { token }, options);
}

export function createAuthClient(options: AuthClientOptions = {}) {
  return {
    buildUrl(path: string, params?: QueryParams) {
      return buildAuthUrl(path, params, options);
    },
    fetch<T>(path: string, params?: QueryParams, requestOptions: AuthRequestOptions = {}) {
      return authFetch<T>(path, params, { ...options, ...requestOptions });
    },
    post<T>(path: string, body: unknown, requestOptions: AuthRequestOptions = {}) {
      return authPost<T>(path, body, { ...options, ...requestOptions });
    },
    login(input: LoginInput, requestOptions: AuthRequestOptions = {}) {
      return authPost<AuthResponse>("/auth/login", input, { ...options, ...requestOptions });
    },
    register(input: RegisterInput, requestOptions: AuthRequestOptions = {}) {
      const payload: RegisterPayload = {
        ...input,
        display_name: input.username,
      };
      return authPost<AuthResponse>("/auth/register", payload, { ...options, ...requestOptions });
    },
    logout(requestOptions: AuthRequestOptions = {}) {
      return authPost<LogoutResponse>("/auth/logout", {}, { ...options, ...requestOptions });
    },
    getSession(requestOptions: AuthRequestOptions = {}) {
      return authFetch<AuthSessionResponse>("/auth/session", undefined, { ...options, ...requestOptions });
    },
    listLoadouts(requestOptions: AuthRequestOptions = {}) {
      return listLoadouts({ ...options, ...requestOptions });
    },
    resolveLoadout(loadoutId: string, requestOptions: AuthRequestOptions = {}) {
      return resolveLoadout(loadoutId, { ...options, ...requestOptions });
    },
    createSimHandoff(input: CreateSimHandoffInput, requestOptions: AuthRequestOptions = {}) {
      return createSimHandoff(input, { ...options, ...requestOptions });
    },
    verifySimHandoff(token: string, requestOptions: AuthRequestOptions = {}) {
      return verifySimHandoff(token, { ...options, ...requestOptions });
    },
  };
}
