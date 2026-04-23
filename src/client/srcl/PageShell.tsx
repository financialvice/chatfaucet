import type { ReactNode } from "react"

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        maxWidth: "min(90ch, 100%)",
        margin: "calc(var(--theme-line-height-base) * 2rem) auto",
        padding: "0 2ch",
      }}
    >
      {children}
    </main>
  )
}
