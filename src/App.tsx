import { OverlayHost } from "@ui-sdk/react/overlays"
import { Preferences } from "@ui-sdk/react/preferences"
import { ColorSchemeControl } from "./theme/color-scheme-control.tsx"
import { colorScheme } from "./theme/color-scheme.ts"
import { Showcase } from "./showcase/showcase.tsx"

function App() {
  return (
    <Preferences preferences={[colorScheme]}>
      <a className="skip-link" href="#content">Skip to content</a>
      <header className="topbar">
        <span className="brand">ui-sdk</span>
        <ColorSchemeControl />
      </header>
      <main id="content">
        <Showcase />
      </main>
      <OverlayHost />
    </Preferences>
  )
}

export { App }
