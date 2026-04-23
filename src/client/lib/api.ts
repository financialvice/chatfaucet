export async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return (await r.json()) as T
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return (await r.json()) as T
}

export async function del<T>(url: string): Promise<T> {
  const r = await fetch(url, { method: "DELETE", credentials: "include" })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return (await r.json()) as T
}

export interface AuthStatus {
  signedIn: boolean
  email?: string | null
  accountId?: string
}

export interface DeviceStart {
  device_auth_id: string
  user_code: string
  interval: number
  verification_uri: string
  verification_uri_complete: string
}

export interface ApiKeyPublic {
  id: string
  name: string
  prefix: string
  created_at: number
  last_used_at: number | null
  revoked_at: number | null
}
