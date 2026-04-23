export function json(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  const h = new Headers(extraHeaders)
  h.set("content-type", "application/json")
  return new Response(JSON.stringify(data), { status, headers: h })
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status)
}

export function requireSameOrigin(req: Request, env: Env): Response | null {
  const origin = req.headers.get("origin")
  if (origin && origin !== `https://${env.APP_HOSTNAME}`) {
    return error("invalid origin", 403)
  }
  return null
}

export function requireJson(req: Request): Response | null {
  const contentType = req.headers.get("content-type") || ""
  if (!contentType.toLowerCase().includes("application/json")) {
    return error("content-type must be application/json", 415)
  }
  return null
}

export async function rateLimit(
  env: Env,
  req: Request,
  name: string,
  limit: number,
  windowSeconds: number,
  subject = clientIp(req),
): Promise<Response | null> {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds)
  const key = `rl:${name}:${bucket}:${await sha256Hex(subject)}`
  const cur = (await env.INDEX.get<{ count?: number }>(key, "json")) ?? {}
  const count = (cur.count ?? 0) + 1
  if (count > limit) {
    return json(
      { error: "rate limit exceeded" },
      429,
      { "retry-after": String(windowSeconds) },
    )
  }
  await env.INDEX.put(key, JSON.stringify({ count }), {
    expirationTtl: windowSeconds * 2,
  })
  return null
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  return (
    req.headers.get("cf-connecting-ip") ??
    forwarded?.split(",")[0]?.trim() ??
    "unknown"
  )
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
