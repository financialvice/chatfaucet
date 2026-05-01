#!/usr/bin/env bun

const baseUrl = process.env.CHATFAUCET_BASE_URL ?? "https://chatfaucet.com";
const appKey = process.env.CHATFAUCET_APP_KEY;
const port = Number(process.env.PORT ?? 8789);
let connectAuthId = process.env.CHATFAUCET_CONNECT_AUTH_ID ?? null;
let connectionId = process.env.CHATFAUCET_CONNECTION_ID ?? null;
let userCode = null;
let verificationUrl = null;
let lastStatus = "idle";
let lastError = null;

if (!appKey) {
  console.error(
    "Set CHATFAUCET_APP_KEY. Create a developer app in the Chat Faucet dashboard."
  );
  process.exit(1);
}

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/connect/start" && req.method === "POST") {
      const started = await appFetch("/api/apps/connect/start", {
        state: "fixture",
      });
      if (!started.ok) {
        lastError = await started.text();
        return wantsJson(req)
          ? json({ error: lastError }, started.status)
          : Response.redirect(new URL("/", req.url), 303);
      }
      const body = await started.json();
      connectAuthId = body.connect_auth_id;
      userCode = body.user_code;
      verificationUrl = body.verification_uri_complete;
      connectionId = null;
      lastStatus = "waiting";
      lastError = null;
      if (wantsJson(req)) {
        return json({
          connectAuthId,
          userCode,
          verificationUrl,
        });
      }
      return Response.redirect(new URL("/waiting", req.url), 303);
    }

    if (url.pathname === "/connect/poll") {
      await pollOnce();
      return json({
        connectionId,
        lastError,
        lastStatus,
        userCode,
        verificationUrl,
      });
    }

    if (url.pathname === "/waiting") {
      return html(`
        <main class="shell">
          <h1>Sign in with ChatGPT</h1>
          <ol class="steps">
            <li>
              Keep this code visible:
              <button class="code" id="copy-code" type="button">${escapeHtml(userCode ?? "missing")}</button>
            </li>
            <li>
              Open ChatGPT, sign in, and enter the code if OpenAI asks for it.
              <p>
                <a class="button" href="${escapeHtml(verificationUrl ?? "#")}" target="_blank" rel="noopener">Continue to ChatGPT</a>
              </p>
            </li>
            <li>Return here. This page will finish automatically.</li>
          </ol>
          <p class="status" id="status">Waiting...</p>
          <p><a href="/">Cancel</a></p>
        </main>
        <script>
          document.getElementById("copy-code").addEventListener("click", async () => {
            await navigator.clipboard?.writeText(${JSON.stringify(userCode ?? "")});
            document.getElementById("copy-code").textContent = "Copied";
            setTimeout(() => {
              document.getElementById("copy-code").textContent = ${JSON.stringify(userCode ?? "missing")};
            }, 1000);
          });
          async function poll() {
            const r = await fetch("/connect/poll");
            const body = await r.json();
            if (body.lastStatus === "success") {
              location.href = "/";
              return;
            }
            document.getElementById("status").textContent =
              body.lastError ? "Error: " + body.lastError : "Waiting...";
            setTimeout(poll, 3000);
          }
          poll();
        </script>
      `);
    }

    if (url.pathname === "/ask" && req.method === "POST") {
      if (!connectionId) return html("<p>No connection yet.</p>", 400);
      const upstream = await appFetch(
        "/v1/responses",
        {
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
        },
        { connectionId }
      );
      const text = await upstream.text();
      return html(`
        <h1>Response</h1>
        <p>Status: ${upstream.status}</p>
        <pre>${escapeHtml(text.slice(0, 8000))}</pre>
        <p><a href="/">Back</a></p>
      `);
    }

    return html(`
      <main class="shell">
        <h1>Example app</h1>
        <p class="muted">A tiny app showing the recommended bring-your-own ChatGPT sign-in flow.</p>
        <p>Connection: <code>${escapeHtml(connectionId ?? "not connected")}</code></p>
        <form method="post" action="/connect/start">
          <button class="button" type="submit">Sign in with ChatGPT</button>
        </form>
        <form method="post" action="/ask">
          <button class="button secondary" type="submit" ${connectionId ? "" : "disabled"}>Send test inference</button>
        </form>
        ${lastError ? `<p class="error">${escapeHtml(lastError)}</p>` : ""}
      </main>
    `);
  },
});

console.log(`Fixture running at http://localhost:${port}`);

async function pollOnce() {
  if (!connectAuthId || lastStatus === "success") return;
  const r = await appFetch("/api/apps/connect/poll", {
    connect_auth_id: connectAuthId,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    lastError = JSON.stringify(body);
    return;
  }
  if (body.status === "success") {
    connectionId = body.connection_id;
    connectAuthId = null;
    userCode = null;
    verificationUrl = null;
    lastStatus = "success";
    lastError = null;
    return;
  }
  lastStatus = body.status ?? "waiting";
  lastError = body.error ?? null;
}

function appFetch(path, body, opts = {}) {
  const headers = {
    Authorization: `Bearer ${appKey}`,
    "Content-Type": "application/json",
  };
  if (opts.connectionId) {
    headers["ChatFaucet-Connection"] = opts.connectionId;
  }
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function html(body, status = 200) {
  return new Response(
    `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Example app</title>
<style>
  :root {
    color-scheme: light dark;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  body {
    margin: 0;
    background: Canvas;
    color: CanvasText;
  }
  .shell {
    box-sizing: border-box;
    max-width: 42rem;
    padding: 3rem 1.25rem;
    margin: 0 auto;
  }
  h1 {
    margin: 0 0 1rem;
    font-size: clamp(2rem, 8vw, 4rem);
    line-height: 0.95;
  }
  .muted {
    color: color-mix(in srgb, CanvasText 70%, Canvas 30%);
  }
  .steps {
    padding-left: 1.5rem;
  }
  .steps li {
    margin: 0.9rem 0;
  }
  .code {
    display: block;
    width: fit-content;
    margin-top: 0.5rem;
    padding: 0.45rem 0.7rem;
    border: 1px solid currentColor;
    border-radius: 0.45rem;
    background: color-mix(in srgb, CanvasText 10%, Canvas 90%);
    color: CanvasText;
    font: 800 1.65rem ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.08em;
    cursor: pointer;
  }
  .button {
    display: inline-block;
    margin: 0.25rem 0;
    padding: 0.65rem 0.9rem;
    border: 1px solid currentColor;
    border-radius: 0.45rem;
    background: CanvasText;
    color: Canvas;
    font: inherit;
    text-decoration: none;
    cursor: pointer;
  }
  .button.secondary {
    background: Canvas;
    color: CanvasText;
  }
  .button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  .status {
    font-weight: 700;
  }
  .error {
    color: #b00020;
  }
</style>
${body}`,
    {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    }
  );
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function wantsJson(req) {
  return req.headers.get("accept")?.includes("application/json");
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
