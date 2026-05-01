import { getSession } from "./index-kv";
import {
  error,
  json,
  parseCookie,
  randomSlug,
  rateLimit,
  requireJson,
  requireSameOrigin,
  setCookieHeader,
  sha256Hex,
} from "./util";

const APP_KEY_PREFIX = "chf_app_";
const SESSION_COOKIE = "chatfaucet_session";
const CONNECT_RETURN_COOKIE = "chatfaucet_connect_return";
const CONNECT_RETURN_TTL_SECONDS = 15 * 60;

export interface DeveloperApp {
  app_id: string;
  created_at: number;
  name: string;
  owner_account_id: string;
  redirect_uri: string;
  updated_at: number;
}

export interface DeveloperAppKey {
  app_id: string;
  created_at: number;
  hash: string;
  key_id: string;
  prefix: string;
  revoked_at: number | null;
}

export interface AppConnection {
  account_id: string;
  app_id: string;
  connection_id: string;
  created_at: number;
  email: string | null;
  revoked_at: number | null;
}

export interface AppKeyIndexRow {
  app_id: string;
  key_id: string;
}

function mintAppKey(): string {
  return `${APP_KEY_PREFIX}${randomSlug(48)}`;
}

function publicApp(app: DeveloperApp) {
  return {
    app_id: app.app_id,
    created_at: app.created_at,
    name: app.name,
    redirect_uri: app.redirect_uri,
    updated_at: app.updated_at,
  };
}

function safeRedirectUri(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (!(url.protocol === "https:" || url.hostname === "localhost")) {
    return null;
  }
  url.hash = "";
  return url.toString();
}

function appKeyIndexKey(hash: string): string {
  return `appkey:${hash}`;
}

function appKeyRecordKey(appId: string, keyId: string): string {
  return `app:${appId}:key:${keyId}`;
}

function appOwnerIndexKey(ownerAccountId: string, appId: string): string {
  return `owner-app:${ownerAccountId}:${appId}`;
}

export async function getDeveloperApp(
  env: Env,
  appId: string
): Promise<DeveloperApp | null> {
  return (await env.INDEX.get(`app:${appId}`, "json")) as DeveloperApp | null;
}

async function setDeveloperApp(env: Env, app: DeveloperApp): Promise<void> {
  await env.INDEX.put(`app:${app.app_id}`, JSON.stringify(app));
  await env.INDEX.put(
    appOwnerIndexKey(app.owner_account_id, app.app_id),
    JSON.stringify({ app_id: app.app_id })
  );
}

async function getDeveloperAppKey(
  env: Env,
  appId: string,
  keyId: string
): Promise<DeveloperAppKey | null> {
  return (await env.INDEX.get(
    appKeyRecordKey(appId, keyId),
    "json"
  )) as DeveloperAppKey | null;
}

export async function getActiveAppByApiKey(
  env: Env,
  apiKey: string
): Promise<(AppKeyIndexRow & { hash: string }) | null> {
  const hash = await sha256Hex(apiKey);
  const row = (await env.INDEX.get(
    appKeyIndexKey(hash),
    "json"
  )) as AppKeyIndexRow | null;
  if (!row) return null;

  const key = await getDeveloperAppKey(env, row.app_id, row.key_id);
  if (!key || key.revoked_at != null || key.hash !== hash) return null;

  const app = await getDeveloperApp(env, row.app_id);
  if (!app) return null;

  return { ...row, hash };
}

export async function getAppConnection(
  env: Env,
  connectionId: string
): Promise<AppConnection | null> {
  return (await env.INDEX.get(
    `conn:${connectionId}`,
    "json"
  )) as AppConnection | null;
}

export function connectReturnCookie(env: Env, pathAndQuery: string): string {
  return setCookieHeader(
    CONNECT_RETURN_COOKIE,
    encodeURIComponent(pathAndQuery),
    {
      domain: env.APP_HOSTNAME,
      maxAge: CONNECT_RETURN_TTL_SECONDS,
      sameSite: "Lax",
    }
  );
}

export function clearConnectReturnCookie(env: Env): string {
  return setCookieHeader(CONNECT_RETURN_COOKIE, "", {
    domain: env.APP_HOSTNAME,
    maxAge: 0,
    sameSite: "Lax",
  });
}

export function getConnectReturn(req: Request): string | null {
  const raw = parseCookie(req.headers.get("cookie"), CONNECT_RETURN_COOKIE);
  if (!raw) return null;
  try {
    const path = decodeURIComponent(raw);
    return path.startsWith("/connect/") ? path : null;
  } catch {
    return null;
  }
}

export async function listDeveloperApps(
  req: Request,
  env: Env
): Promise<Response> {
  const sid = parseCookie(req.headers.get("cookie"), SESSION_COOKIE);
  if (!sid) return error("not signed in", 401);
  const sess = await getSession(env, sid);
  if (!sess) return error("session expired", 401);

  const apps: DeveloperApp[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.INDEX.list({
      cursor,
      prefix: `owner-app:${sess.account_id}:`,
    });
    for (const key of page.keys) {
      const item = (await env.INDEX.get(key.name, "json")) as {
        app_id?: string;
      } | null;
      if (!item?.app_id) continue;
      const app = await getDeveloperApp(env, item.app_id);
      if (app) apps.push(app);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  apps.sort((a, b) => b.created_at - a.created_at);
  return json({ apps: apps.map(publicApp) });
}

export async function createDeveloperApp(
  req: Request,
  env: Env
): Promise<Response> {
  const badOrigin = requireSameOrigin(req, env);
  if (badOrigin) return badOrigin;
  const badJson = requireJson(req);
  if (badJson) return badJson;

  const sid = parseCookie(req.headers.get("cookie"), SESSION_COOKIE);
  if (!sid) return error("not signed in", 401);
  const sess = await getSession(env, sid);
  if (!sess) return error("session expired", 401);

  const limited = await rateLimit(
    env,
    req,
    "create-developer-app",
    20,
    60 * 60,
    sess.account_id
  );
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    redirect_uri?: string;
  };
  const name = (body.name ?? "My app").trim().slice(0, 80) || "My app";
  const redirectUri = safeRedirectUri(body.redirect_uri);
  if (!redirectUri) {
    return error(
      "redirect_uri must be a valid https URL or localhost URL",
      400
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const appId = `app_${randomSlug(24)}`;
  const rawKey = mintAppKey();
  const hash = await sha256Hex(rawKey);
  const keyId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const app: DeveloperApp = {
    app_id: appId,
    created_at: now,
    name,
    owner_account_id: sess.account_id,
    redirect_uri: redirectUri,
    updated_at: now,
  };
  const key: DeveloperAppKey = {
    app_id: appId,
    created_at: now,
    hash,
    key_id: keyId,
    prefix: rawKey.slice(0, 16),
    revoked_at: null,
  };

  await setDeveloperApp(env, app);
  await env.INDEX.put(appKeyRecordKey(appId, keyId), JSON.stringify(key));
  await env.INDEX.put(
    appKeyIndexKey(hash),
    JSON.stringify({ app_id: appId, key_id: keyId })
  );

  return json({
    app: publicApp(app),
    api_key: rawKey,
    key_id: keyId,
    connect_url: `https://${env.APP_HOSTNAME}/connect/${appId}`,
  });
}

export async function handleConnect(
  req: Request,
  env: Env,
  appId: string
): Promise<Response> {
  const app = await getDeveloperApp(env, appId);
  if (!app) return error("app not found", 404);

  const url = new URL(req.url);
  const redirectUri = safeRedirectUri(url.searchParams.get("redirect_uri"));
  if (redirectUri && redirectUri !== app.redirect_uri) {
    return error("redirect_uri does not match the registered app", 400);
  }

  const sid = parseCookie(req.headers.get("cookie"), SESSION_COOKIE);
  const sess = sid ? await getSession(env, sid) : null;
  if (!sess) {
    return new Response(null, {
      status: 303,
      headers: {
        location: "/",
        "set-cookie": connectReturnCookie(env, url.pathname + url.search),
      },
    });
  }

  const connectionId = `conn_${randomSlug(32)}`;
  const now = Math.floor(Date.now() / 1000);
  const connection: AppConnection = {
    account_id: sess.account_id,
    app_id: app.app_id,
    connection_id: connectionId,
    created_at: now,
    email: sess.email,
    revoked_at: null,
  };
  await env.INDEX.put(`conn:${connectionId}`, JSON.stringify(connection));
  await env.INDEX.put(
    `app-conn:${app.app_id}:${connectionId}`,
    JSON.stringify({ connection_id: connectionId, account_id: sess.account_id })
  );

  const out = new URL(app.redirect_uri);
  out.searchParams.set("connection_id", connectionId);
  out.searchParams.set("chatfaucet_app_id", app.app_id);
  const state = url.searchParams.get("state");
  if (state) out.searchParams.set("state", state);

  return new Response(null, {
    status: 303,
    headers: {
      location: out.toString(),
      "set-cookie": clearConnectReturnCookie(env),
    },
  });
}
