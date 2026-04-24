# Chat Faucet

CLI for [chatfaucet.com](https://chatfaucet.com), which exposes
your ChatGPT plan as an OpenAI-compatible Responses API.

## Usage

Requires Node 18+ (or [Bun](https://bun.sh)).

```sh
npx chatfaucet login
npx chatfaucet env
```

After login, use the printed exports with OpenAI-compatible SDKs and tools:

```sh
export OPENAI_API_KEY="chf_..."
export OPENAI_BASE_URL="https://chatfaucet.com/v1"
```

`login` also prints a one-time `Sign-in link:`. Open it in a browser to view the dashboard already signed in; it expires after 15 minutes and can be used once.

Bun users can swap `npx` for `bunx`:

```sh
bunx chatfaucet login
```

## Commands

```sh
chatfaucet login [--name <label>] [-y] [--no-read-auth-json]
chatfaucet env
chatfaucet keys
chatfaucet logout
chatfaucet delete-account --yes
chatfaucet --help
```

## Environment

- `CHATFAUCET_HOST` overrides the gateway host.
- `CHATFAUCET_API_KEY` and `CHATFAUCET_BASE_URL` can be used for headless API-key commands.

`-y` confirms uploading tokens from `~/.codex/auth.json` when that file is present. Agents should only use it after the user has clearly confirmed.
