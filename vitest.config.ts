import { configDefaults, defineConfig, mergeConfig } from "vitest/config"
import viteConfig from "./vite.config.ts"

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      exclude: [...configDefaults.exclude, ".claude/**"],
      setupFiles: ["./src/test/setup.ts"],
      // Departs from ui-sdk's `css: false` template: the style-guard test reads CSS as text.
      css: { include: [/\?raw$/] },
    },
  })
)
