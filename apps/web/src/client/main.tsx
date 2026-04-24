import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./srcl/styles/fonts.css";
import "./srcl/styles/global.css";
import { App } from "./App";
import { persister, queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./srcl/theme";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
    >
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </PersistQueryClientProvider>
  </StrictMode>
);
