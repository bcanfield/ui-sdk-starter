import { OverlayHost } from "@ui-sdk/react/overlays"
import { AgentSection } from "./sections/agent-section.tsx"
import { SettingsSection } from "./sections/settings-section.tsx"
import { ToggleSection } from "./sections/toggle-section.tsx"

function App() {
  return (
    <>
      <main>
        <h1>UI SDK Hello World</h1>
        <ToggleSection />
        <SettingsSection />
        <AgentSection />
      </main>
      <OverlayHost />
    </>
  )
}

export { App }
