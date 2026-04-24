export async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) {
    throw new Error(`${r.status} ${await r.text()}`);
  }
  return (await r.json()) as T;
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    throw new Error(`${r.status} ${await r.text()}`);
  }
  return (await r.json()) as T;
}

export async function del<T>(url: string): Promise<T> {
  const r = await fetch(url, { method: "DELETE", credentials: "include" });
  if (!r.ok) {
    throw new Error(`${r.status} ${await r.text()}`);
  }
  return (await r.json()) as T;
}

export interface AuthStatus {
  accountId?: string;
  email?: string | null;
  signedIn: boolean;
}

export interface DeviceStart {
  device_auth_id: string;
  interval: number;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
}

export interface ApiKeyPublic {
  created_at: number;
  id: string;
  last_used_at: number | null;
  name: string;
  prefix: string;
  revoked_at: number | null;
}
