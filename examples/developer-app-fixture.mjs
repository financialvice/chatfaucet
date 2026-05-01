#!/usr/bin/env bun

const baseUrl = process.env.CHATFAUCET_BASE_URL ?? "https://chatfaucet.com";
const appId = process.env.CHATFAUCET_APP_ID;
const appKey = process.env.CHATFAUCET_APP_KEY;
const port = Number(process.env.PORT ?? 8789);
let connectionId = process.env.CHATFAUCET_CONNECTION_ID ?? null;

if (!(appId && appKey)) {
  console.error(
    "Set CHATFAUCET_APP_ID and CHATFAUCET_APP_KEY. Create them in the Chat Faucet dashboard."
  );
  process.exit(1);
}

const redirectUri = `http://localhost:${port}/callback`;
const connectUrl = new URL(`/connect/${appId}`, baseUrl);
connectUrl.searchParams.set("redirect_uri", redirectUri);
connectUrl.searchParams.set("state", "fixture");

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/callback") {
      connectionId = url.searchParams.get("connection_id");
      return html(`
        <h1>Connected</h1>
        <p><code>${escapeHtml(connectionId ?? "")}</code></p>
        <p><a href="/">Return to fixture</a></p>
      `);
    }

    if (url.pathname === "/ask" && req.method === "POST") {
      if (!connectionId) return html("<p>No connection yet.</p>", 400);
      const upstream = await fetch(new URL("/v1/responses", baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appKey}`,
          "ChatFaucet-Connection": connectionId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5.5",
          instructions: "",
          input: [
            {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "Say fixture-ok." }],
            },
          ],
          stream: true,
          store: false,
        }),
      });
      const text = await upstream.text();
      return html(`
        <h1>Response</h1>
        <p>Status: ${upstream.status}</p>
        <pre>${escapeHtml(text.slice(0, 8000))}</pre>
        <p><a href="/">Back</a></p>
      `);
    }

    return html(`
      <h1>Developer app fixture</h1>
      <p>Registered redirect URI: <code>${escapeHtml(redirectUri)}</code></p>
      <p>Connection: <code>${escapeHtml(connectionId ?? "not connected")}</code></p>
      <p><a href="${connectUrl.toString()}">Sign in with ChatGPT via Chat Faucet</a></p>
      <form method="post" action="/ask">
        <button type="submit" ${connectionId ? "" : "disabled"}>Send test inference</button>
      </form>
    `);
  },
});

console.log(`Fixture running at http://localhost:${port}`);
console.log(`Register this redirect URI: ${redirectUri}`);

function html(body, status = 200) {
  return new Response(`<!doctype html><meta charset="utf-8">${body}`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
