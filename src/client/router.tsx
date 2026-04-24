import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useLocation,
} from "@tanstack/react-router"
import { useLayoutEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Landing } from "./pages/Landing"
import { Dashboard } from "./pages/Dashboard"
import { Docs } from "./pages/Docs"
import { Playground } from "./pages/Playground"
import { getJson, type AuthStatus } from "./lib/api"
import { PageShell } from "./srcl/PageShell"
import BlockLoader from "./srcl/components/BlockLoader"

function useAuthStatus() {
  return useQuery({
    queryKey: ["auth-status"],
    queryFn: async () => {
      try {
        return await getJson<AuthStatus>("/api/auth/status")
      } catch {
        return { signedIn: false } as AuthStatus
      }
    },
    staleTime: 5 * 60_000,
  })
}

function useDocumentTitle(title: string) {
  useLayoutEffect(() => {
    document.title = title
  }, [title])
}

const rootRoute = createRootRoute({
  component: () => (
    <PageShell>
      <Outlet />
    </PageShell>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
})

const playgroundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playground",
  component: PlaygroundPage,
})

const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs",
  component: DocsPage,
})

const docsSlugRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/$slug",
  component: DocsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  playgroundRoute,
  docsRoute,
  docsSlugRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

function IndexPage() {
  const queryClient = useQueryClient()
  const { data: status, isPending } = useAuthStatus()
  useDocumentTitle(
    status?.signedIn
      ? "dashboard — Chat Faucet"
      : "Chat Faucet — ChatGPT plan → OpenAI Responses API",
  )

  if (!status && isPending) return <LoadingView />

  return status?.signedIn ? (
    <Dashboard status={status} />
  ) : (
    <Landing
      onAuthed={() => {
        queryClient.invalidateQueries({ queryKey: ["auth-status"] })
      }}
    />
  )
}

function PlaygroundPage() {
  const queryClient = useQueryClient()
  const { data: status, isPending } = useAuthStatus()
  useDocumentTitle("playground — Chat Faucet")

  if (!status && isPending) return <LoadingView />

  return status?.signedIn ? (
    <Playground />
  ) : (
    <Landing
      onAuthed={() => {
        queryClient.invalidateQueries({ queryKey: ["auth-status"] })
      }}
    />
  )
}

function DocsPage() {
  const location = useLocation()
  const { data: status } = useAuthStatus()
  useDocumentTitle("docs — Chat Faucet")
  return <Docs path={location.pathname} signedIn={status?.signedIn ?? false} />
}

function LoadingView() {
  return (
    <span>
      Loading <BlockLoader mode={1} />
    </span>
  )
}
