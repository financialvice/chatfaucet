import { Think } from "@cloudflare/think"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

export class PlaygroundAgent extends Think<Env> {
  private _codex?: ReturnType<typeof createOpenAI>

  private codex() {
    if (this._codex) return this._codex
    const env = this.env
    const accountId = this.name
    const stub = env.ACCOUNT_DO.get(env.ACCOUNT_DO.idFromName(accountId))
    this._codex = createOpenAI({
      apiKey: "placeholder",
      baseURL: `${env.PROXY_URL}/codex`,
      fetch: async (url, init) => {
        const tokens = await stub.ensureFreshToken()
        const headers = new Headers(init?.headers)
        headers.set("Authorization", `Bearer ${tokens.access_token}`)
        headers.set("chatgpt-account-id", tokens.account_id)
        headers.set("originator", "codex_cli_rs")
        headers.set("User-Agent", "chatfaucet")
        headers.set("OpenAI-Beta", "responses=experimental")
        headers.set("X-Proxy-Secret", env.PROXY_SECRET)
        return fetch(url as RequestInfo, { ...init, headers })
      },
    })
    return this._codex
  }

  getModel(): LanguageModel {
    return this.codex().responses("gpt-5.5")
  }

  getSystemPrompt() {
    return "You are a concise assistant inside Chat Faucet's playground. Keep replies short and useful."
  }

  beforeTurn() {
    return {
      providerOptions: {
        openai: {
          store: false,
          instructions: "",
        },
      },
    }
  }
}
