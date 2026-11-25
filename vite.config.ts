import { preferencesScript } from "@ui-sdk/core"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { colorScheme } from "./src/theme/color-scheme.ts"

export default defineConfig({
  plugins: [
    react(),
    {
      name: "color-scheme-before-paint",
      transformIndexHtml: () => [
        { tag: "script", children: preferencesScript([colorScheme]), injectTo: "head" },
      ],
    },
  ],
})
