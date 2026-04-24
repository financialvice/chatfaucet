import docsIndex from "../docs/index.md?raw";
import { json } from "./util";

export function listDocs(): Response {
  return json({ slugs: ["index"] });
}

export function getDoc(slug: string, req?: Request): Response {
  if (slug !== "index") return json({ error: "not found" }, 404);

  // Browsers don't natively render text/markdown — they silently download it
  // and keep the previous tab content visible. Serve text/plain for HTML-accept
  // clients so Chrome/Firefox/Safari show the raw markdown inline, and keep
  // text/markdown for programmatic clients that ask for it.
  const accept = req?.headers.get("accept") || "";
  const asksMd =
    accept.includes("text/markdown") || accept.includes("text/x-markdown");
  const contentType = asksMd
    ? "text/markdown; charset=utf-8"
    : "text/plain; charset=utf-8";

  return new Response(docsIndex, {
    headers: {
      "content-type": contentType,
      "cache-control": "no-store, no-cache, must-revalidate",
      "cdn-cache-control": "no-store",
      vary: "Accept, Sec-Fetch-Dest",
    },
  });
}
