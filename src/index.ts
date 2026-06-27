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

export type ProfileAvatarImageSource = "render" | "scan";

export type ProfileAvatar = {
  card_image_id: string;
  image_source: ProfileAvatarImageSource;
  image_url: string;
  crop: {
    x: number;
    y: number;
    size: number;
  };
};

export type ProfileTitleStyle = {
  text_color: string;
  font_family?: "display" | "body" | "mono";
  font_weight?: number;
  gradient?: {
    from: string;
    via?: string;
    to: string;
    angle?: number;
  } | null;
  outline_color?: string | null;
  glow_color?: string | null;
  animation?: "none" | "shine" | "pulse";
};

export type ProfileTitle = {
  key: string;
  label: string;
  style: ProfileTitleStyle;
};

export type AuthUser = {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  email_verified: boolean;
  profile: {
    avatar: ProfileAvatar | null;
    title: ProfileTitle | null;
    unlocked_titles?: ProfileTitle[];
  };
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

export type UpdateProfileAvatarInput = {
  card_number: string;
  language: string;
  variant_index: number;
  image_source: ProfileAvatarImageSource;
  crop: {
    x: number;
    y: number;
    size: number;
  };
};

export type UpdateProfileAvatarResponse = {
  data: {
    user: AuthUser;
  };
};

export type UpdateProfileTitleInput = {
  title_key: string | null;
};

export type UpdateProfileTitleResponse = {
  data: {
    user: AuthUser;
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
  leader_card_number: string | null;
  leader_variant_index: number | null;
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

export type CreateLoadoutFromDeckHashInput = {
  name: string;
  deck_hash: string;
};

export type LoadoutResponse = {
  data: Loadout;
};

export type DeckCollectionKind = "deck" | "list";

export type DeckLibraryFolder = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DeckCollection = {
  id: string;
  user_id: string;
  name: string;
  deck_hash: string | null;
  deck: Record<string, unknown> | null;
  folder_id: string | null;
  kind: DeckCollectionKind;
  leader_card_number: string | null;
  leader_variant_index: number | null;
  leader_copy_count: number;
  preview_card_number: string | null;
  preview_variant_index: number | null;
  max_copies_of_single_card: number;
  main_count: number;
  favorite: boolean;
  loadout_id: string | null;
  don_deck_id: string | null;
  playmat_cosmetic_id: string | null;
  don_sleeve_cosmetic_id: string | null;
  deck_sleeve_cosmetic_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DeckLibrary = {
  folders: DeckLibraryFolder[];
  decks: DeckCollection[];
};

export type DeckLibraryResponse = {
  data: DeckLibrary;
};

export type DeckLibraryFolderWrite = {
  id?: string;
  name: string;
  sort_order?: number;
};

export type DeckCollectionWrite = {
  id?: string;
  name: string;
  deck_hash: string;
  folder_id?: string | null;
  kind?: DeckCollectionKind;
  leader_card_number?: string | null;
  leader_variant_index?: number | null;
  leader_copy_count?: number;
  preview_card_number?: string | null;
  preview_variant_index?: number | null;
  max_copies_of_single_card?: number;
  main_count?: number;
  favorite?: boolean;
  loadout_id?: string | null;
  don_deck_id?: string | null;
  playmat_cosmetic_id?: string | null;
  don_sleeve_cosmetic_id?: string | null;
  deck_sleeve_cosmetic_id?: string | null;
};

export type DeckLibraryWrite = {
  folders: DeckLibraryFolderWrite[];
  decks: DeckCollectionWrite[];
};

export type CreateSimHandoffInput = {
  loadout_id: string;
  lobby_id?: string | null;
  seat_id?: string | null;
};

export type CreateSimHandoffsInput = {
  loadout_ids: string[];
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

export type SimHandoffBatchError = {
  status: number;
  message: string;
};

export type SimHandoffBatchCreated = {
  loadout_id: string;
  status: "created";
  token: string;
  expires_at: string;
};

export type SimHandoffBatchRejected = {
  loadout_id: string;
  status: "rejected";
  error: SimHandoffBatchError;
};

export type SimHandoffBatchResponse = {
  data: {
    handoffs: Array<SimHandoffBatchCreated | SimHandoffBatchRejected>;
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

export type SimHandoffBatchVerified = {
  status: "verified";
  claims: SimHandoffClaims;
  resolved_loadout: ResolvedSimLoadout;
};

export type SimHandoffBatchVerifyRejected = {
  status: "rejected";
  error: SimHandoffBatchError;
};

export type SimHandoffBatchVerifyResponse = {
  data: {
    handoffs: Array<SimHandoffBatchVerified | SimHandoffBatchVerifyRejected>;
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

export async function authPut<T>(
  path: string,
  body: unknown,
  options: AuthRequestOptions = {},
) {
  return requestJson<T>(
    buildAuthUrl(path, undefined, options),
    {
      method: "PUT",
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

export function createSimHandoffs(
  input: CreateSimHandoffsInput,
  options: AuthRequestOptions = {},
) {
  return authPost<SimHandoffBatchResponse>("/sim/handoffs", input, options);
}

export function getDeckLibrary(options: AuthRequestOptions = {}) {
  return authFetch<DeckLibraryResponse>("/deck-library", undefined, options);
}

export function replaceDeckLibrary(
  input: DeckLibraryWrite,
  options: AuthRequestOptions = {},
) {
  return authPut<DeckLibraryResponse>("/deck-library", input, options);
}

export function syncDeckLibrary(
  input: DeckLibraryWrite,
  options: AuthRequestOptions = {},
) {
  return authPost<DeckLibraryResponse>("/deck-library/sync", input, options);
}

export function updateProfileAvatar(
  input: UpdateProfileAvatarInput,
  options: AuthRequestOptions = {},
) {
  return authPut<UpdateProfileAvatarResponse>("/me/profile/avatar", input, options);
}

export function updateProfileTitle(
  input: UpdateProfileTitleInput,
  options: AuthRequestOptions = {},
) {
  return authPut<UpdateProfileTitleResponse>("/me/profile/title", input, options);
}

export function listLoadouts(options: AuthRequestOptions = {}) {
  return authFetch<LoadoutListResponse>("/loadouts", undefined, options);
}

export function createLoadoutFromDeckHash(
  input: CreateLoadoutFromDeckHashInput,
  options: AuthRequestOptions = {},
) {
  return authPost<LoadoutResponse>("/loadouts/import-deck-hash", input, options);
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

export function verifySimHandoffs(
  tokens: string[],
  options: AuthRequestOptions = {},
) {
  return authPost<SimHandoffBatchVerifyResponse>("/sim/handoffs/verify", { tokens }, options);
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
    put<T>(path: string, body: unknown, requestOptions: AuthRequestOptions = {}) {
      return authPut<T>(path, body, { ...options, ...requestOptions });
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
    getDeckLibrary(requestOptions: AuthRequestOptions = {}) {
      return getDeckLibrary({ ...options, ...requestOptions });
    },
    replaceDeckLibrary(input: DeckLibraryWrite, requestOptions: AuthRequestOptions = {}) {
      return replaceDeckLibrary(input, { ...options, ...requestOptions });
    },
    syncDeckLibrary(input: DeckLibraryWrite, requestOptions: AuthRequestOptions = {}) {
      return syncDeckLibrary(input, { ...options, ...requestOptions });
    },
    updateProfileAvatar(input: UpdateProfileAvatarInput, requestOptions: AuthRequestOptions = {}) {
      return updateProfileAvatar(input, { ...options, ...requestOptions });
    },
    updateProfileTitle(input: UpdateProfileTitleInput, requestOptions: AuthRequestOptions = {}) {
      return updateProfileTitle(input, { ...options, ...requestOptions });
    },
    createLoadoutFromDeckHash(input: CreateLoadoutFromDeckHashInput, requestOptions: AuthRequestOptions = {}) {
      return createLoadoutFromDeckHash(input, { ...options, ...requestOptions });
    },
    resolveLoadout(loadoutId: string, requestOptions: AuthRequestOptions = {}) {
      return resolveLoadout(loadoutId, { ...options, ...requestOptions });
    },
    createSimHandoff(input: CreateSimHandoffInput, requestOptions: AuthRequestOptions = {}) {
      return createSimHandoff(input, { ...options, ...requestOptions });
    },
    createSimHandoffs(input: CreateSimHandoffsInput, requestOptions: AuthRequestOptions = {}) {
      return createSimHandoffs(input, { ...options, ...requestOptions });
    },
    verifySimHandoff(token: string, requestOptions: AuthRequestOptions = {}) {
      return verifySimHandoff(token, { ...options, ...requestOptions });
    },
    verifySimHandoffs(tokens: string[], requestOptions: AuthRequestOptions = {}) {
      return verifySimHandoffs(tokens, { ...options, ...requestOptions });
    },
  };
}
