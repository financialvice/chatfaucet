import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./srcl/styles/fonts.css"
import "./srcl/styles/global.css"
import { App } from "./App"
import { ThemeProvider } from "./srcl/theme"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
