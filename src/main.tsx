import "@ui-sdk/core/web.css"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "@fontsource/geist-pixel/latin-400.css"
import "./index.css"
import "./theme/theme-color.ts"
import "./agent.ts"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
