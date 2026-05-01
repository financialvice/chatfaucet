import { getSession } from "./index-kv";
import { devicePollOnce, deviceStart, upsertAccount } from "./signin";
import {
  error,
  json,
  parseCookie,
  randomSlug,
  rateLimit,
  requireJson,
  requireSameOrigin,
  sha256Hex,
} from "./util";

const APP_KEY_PREFIX = "chf_app_";
const SESSION_COOKIE = "chatfaucet_session";
const CONNECT_SESSION_TTL_SECONDS = 15 * 60;

export interface DeveloperApp {
  app_id: string;
  created_at: number;
  name: string;
  owner_account_id: string;
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

export interface AppConnectSession {
  app_id: string;
  connect_auth_id: string;
  created_at: number;
  device_auth_id: string;
  state: string | null;
  user_code: string;
}

function mintAppKey(): string {
  return `${APP_KEY_PREFIX}${randomSlug(48)}`;
}

function publicApp(app: DeveloperApp) {
  return {
    app_id: app.app_id,
    created_at: app.created_at,
    name: app.name,
    updated_at: app.updated_at,
  };
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

async function authAppKey(
  req: Request,
  env: Env
): Promise<{ appId: string; keyId: string } | Response> {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return error("missing Bearer token", 401);

  const app = await getActiveAppByApiKey(env, m[1]!.trim());
  if (!app) return error("invalid app key", 401);

  return { appId: app.app_id, keyId: app.key_id };
}

function connectSessionKey(authId: string): string {
  return `app-connect:${authId}`;
}

async function createConnection(
  env: Env,
  appId: string,
  accountId: string,
  email: string | null
): Promise<AppConnection> {
  const connectionId = `conn_${randomSlug(32)}`;
  const now = Math.floor(Date.now() / 1000);
  const connection: AppConnection = {
    account_id: accountId,
    app_id: appId,
    connection_id: connectionId,
    created_at: now,
    email,
    revoked_at: null,
  };
  await env.INDEX.put(`conn:${connectionId}`, JSON.stringify(connection));
  await env.INDEX.put(
    `app-conn:${appId}:${connectionId}`,
    JSON.stringify({ connection_id: connectionId, account_id: accountId })
  );
  return connection;
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
  };
  const name = (body.name ?? "My app").trim().slice(0, 80) || "My app";

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
  });
}

export async function startAppConnect(
  req: Request,
  env: Env
): Promise<Response> {
  const auth = await authAppKey(req, env);
  if (auth instanceof Response) return auth;

  const badJson = requireJson(req);
  if (badJson) return badJson;

  const app = await getDeveloperApp(env, auth.appId);
  if (!app) return error("app not found", 404);

  const limited = await rateLimit(
    env,
    req,
    "app-connect-start",
    60,
    60,
    auth.appId
  );
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as { state?: string };
  const deviceResp = await deviceStart();
  if (!deviceResp.ok) return deviceResp;
  const device = (await deviceResp.json()) as {
    device_auth_id: string;
    interval: number;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
  };
  const connectAuthId = `cna_${randomSlug(32)}`;
  const session: AppConnectSession = {
    app_id: app.app_id,
    connect_auth_id: connectAuthId,
    created_at: Math.floor(Date.now() / 1000),
    device_auth_id: device.device_auth_id,
    state:
      typeof body.state === "string" ? body.state.slice(0, 500) || null : null,
    user_code: device.user_code,
  };
  await env.INDEX.put(
    connectSessionKey(connectAuthId),
    JSON.stringify(session),
    {
      expirationTtl: CONNECT_SESSION_TTL_SECONDS,
    }
  );

  return json({
    app_id: app.app_id,
    connect_auth_id: connectAuthId,
    interval: device.interval,
    state: session.state,
    user_code: device.user_code,
    verification_uri: device.verification_uri,
    verification_uri_complete: device.verification_uri_complete,
  });
}

export async function pollAppConnect(
  req: Request,
  env: Env
): Promise<Response> {
  const auth = await authAppKey(req, env);
  if (auth instanceof Response) return auth;

  const badJson = requireJson(req);
  if (badJson) return badJson;

  const limited = await rateLimit(
    env,
    req,
    "app-connect-poll",
    180,
    60,
    auth.appId
  );
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as {
    connect_auth_id?: string;
  } | null;
  if (!body?.connect_auth_id) return error("connect_auth_id required", 400);

  const session = (await env.INDEX.get(
    connectSessionKey(body.connect_auth_id),
    "json"
  )) as AppConnectSession | null;
  if (!session || session.app_id !== auth.appId) {
    return error("connect session expired or not found", 404);
  }

  const r = await devicePollOnce({
    device_auth_id: session.device_auth_id,
    user_code: session.user_code,
  });
  if (r.status !== "success") {
    return json(r, r.status === "error" ? 500 : 200);
  }

  const up = await upsertAccount(env, r.tokens!, r.email ?? null);
  const connection = await createConnection(
    env,
    session.app_id,
    up.accountId,
    up.email
  );
  await env.INDEX.delete(connectSessionKey(session.connect_auth_id));

  return json({
    status: "success",
    app_id: session.app_id,
    connection_id: connection.connection_id,
    email: connection.email,
    state: session.state,
  });
}
