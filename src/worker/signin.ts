import {
  CODEX_CLIENT_ID,
  CODEX_ISSUER,
  decodeJwtExp,
  extractAccountId,
  extractEmail,
  type StoredTokens,
} from "./codex-auth"
import type { AccountMeta } from "./AccountDO"
import { error, json } from "./util"

const VERIFICATION_URI = `${CODEX_ISSUER}/codex/device`

export async function deviceStart(): Promise<Response> {
  const r = await fetch(`${CODEX_ISSUER}/api/accounts/deviceauth/usercode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CODEX_CLIENT_ID }),
  })
  if (!r.ok) {
    return error(`device-start failed: ${r.status} ${await r.text()}`, 500)
  }
  const body = (await r.json()) as {
    device_auth_id: string
    user_code: string
    interval?: string | number
  }
  return json({
    device_auth_id: body.device_auth_id,
    user_code: body.user_code,
    interval: Math.max(Number(body.interval) || 5, 1),
    verification_uri: VERIFICATION_URI,
    verification_uri_complete: `${VERIFICATION_URI}?code=${encodeURIComponent(body.user_code)}`,
  })
}

export interface DevicePollInput {
  device_auth_id: string
  user_code: string
}

export interface DevicePollResult {
  status: "pending" | "success" | "error"
  tokens?: StoredTokens
  email?: string | null
  error?: string
}

export async function devicePollOnce(
  input: DevicePollInput,
): Promise<DevicePollResult> {
  const poll = await fetch(
    `${CODEX_ISSUER}/api/accounts/deviceauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  )

  if (poll.status === 403 || poll.status === 404) {
    return { status: "pending" }
  }
  if (!poll.ok) {
    return {
      status: "error",
      error: `poll failed: ${poll.status} ${await poll.text()}`,
    }
  }

  const { authorization_code, code_verifier } = (await poll.json()) as {
    authorization_code: string
    code_verifier: string
  }

  const tokenResp = await fetch(`${CODEX_ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorization_code,
      redirect_uri: `${CODEX_ISSUER}/deviceauth/callback`,
      client_id: CODEX_CLIENT_ID,
      code_verifier,
    }),
  })

  if (!tokenResp.ok) {
    return {
      status: "error",
      error: `token exchange failed: ${tokenResp.status} ${await tokenResp.text()}`,
    }
  }

  const body = (await tokenResp.json()) as {
    access_token: string
    refresh_token: string
    id_token: string
  }

  const accountId = extractAccountId(body.id_token)
  if (!accountId) {
    return { status: "error", error: "id_token missing chatgpt_account_id" }
  }

  const tokens: StoredTokens = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    id_token: body.id_token,
    account_id: accountId,
    access_token_exp: decodeJwtExp(body.access_token),
    last_refresh: Math.floor(Date.now() / 1000),
  }

  return {
    status: "success",
    tokens,
    email: extractEmail(body.id_token),
  }
}

export async function upsertAccount(
  env: Env,
  tokens: StoredTokens,
  email: string | null,
): Promise<{ accountId: string; email: string | null }> {
  const accountId = tokens.account_id

  const id = env.ACCOUNT_DO.idFromName(accountId)
  const stub = env.ACCOUNT_DO.get(id)

  const existing = await stub.getMeta()

  const now = Math.floor(Date.now() / 1000)
  const meta: AccountMeta = {
    account_id: accountId,
    email: email ?? existing?.email ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }

  await stub.setMeta(meta)
  await stub.setTokens(tokens)

  return { accountId, email: meta.email }
}
