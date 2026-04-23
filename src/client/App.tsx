import { useEffect, useState } from "react"
import { Landing } from "./pages/Landing"
import { Dashboard } from "./pages/Dashboard"
import { Docs } from "./pages/Docs"
import { Playground } from "./pages/Playground"
import { getJson, type AuthStatus } from "./lib/api"
import { PageShell } from "./srcl/PageShell"
import BlockLoader from "./srcl/components/BlockLoader"

export function App() {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    getJson<AuthStatus>("/api/auth/status")
      .then(setStatus)
      .catch(() => setStatus({ signedIn: false }))
  }, [])

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  if (path === "/docs" || path.startsWith("/docs/")) {
    return (
      <PageShell>
        <Docs path={path} signedIn={status?.signedIn ?? false} />
      </PageShell>
    )
  }

  if (status == null) {
    return (
      <PageShell>
        <span>
          Loading <BlockLoader mode={1} />
        </span>
      </PageShell>
    )
  }

  return (
    <PageShell>
      {status.signedIn && path === "/playground" ? (
        <Playground />
      ) : status.signedIn ? (
        <Dashboard status={status} />
      ) : (
        <Landing
          onAuthed={() => {
            getJson<AuthStatus>("/api/auth/status")
              .then(setStatus)
              .catch(() => setStatus({ signedIn: false }))
          }}
        />
      )}
    </PageShell>
  )
}
