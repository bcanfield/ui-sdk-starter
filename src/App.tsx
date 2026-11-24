import { OverlayHost } from "@ui-sdk/react/overlays"
import { Preferences } from "@ui-sdk/react/preferences"
import { ColorSchemeControl } from "./theme/color-scheme-control.tsx"
import { colorScheme } from "./theme/color-scheme.ts"
import { AgentSection } from "./sections/agent-section.tsx"
import { SettingsSection } from "./sections/settings-section.tsx"
import { ToggleSection } from "./sections/toggle-section.tsx"

function App() {
  return (
    <Preferences preferences={[colorScheme]}>
      <a className="skip-link" href="#content">Skip to content</a>
      <main id="content">
        <ColorSchemeControl />
        <h1>UI SDK Hello World</h1>
        <ToggleSection />
        <SettingsSection />
        <AgentSection />
      </main>
      <OverlayHost />
    </Preferences>
  )
}

export { App }
