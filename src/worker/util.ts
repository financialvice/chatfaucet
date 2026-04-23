export function json(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  const h = new Headers(extraHeaders)
  h.set("content-type", "application/json")
  return new Response(JSON.stringify(data), { status, headers: h })
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status)
}

export function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

const URL_SAFE_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

export function randomSlug(len: number): string {
  const bytes = randomBytes(len)
  let s = ""
  for (let i = 0; i < len; i++) {
    s += URL_SAFE_ALPHABET[bytes[i]! % URL_SAFE_ALPHABET.length]
  }
  return s
}

export function randomId(): string {
  return randomSlug(16)
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  )
  const bytes = new Uint8Array(buf)
  let s = ""
  for (const b of bytes) s += b.toString(16).padStart(2, "0")
  return s
}

export function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=")
    if (k === name) return v.join("=")
  }
  return null
}

export function setCookieHeader(
  name: string,
  value: string,
  opts: {
    domain?: string
    path?: string
    maxAge?: number
    httpOnly?: boolean
    secure?: boolean
    sameSite?: "Lax" | "Strict" | "None"
  },
): string {
  const parts = [`${name}=${value}`]
  if (opts.domain) parts.push(`Domain=${opts.domain}`)
  parts.push(`Path=${opts.path ?? "/"}`)
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`)
  if (opts.httpOnly !== false) parts.push("HttpOnly")
  if (opts.secure !== false) parts.push("Secure")
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`)
  return parts.join("; ")
}

