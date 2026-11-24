import { AgentSection } from "./agent-section.tsx"
import { SettingsSection } from "./settings-section.tsx"
import { ToggleSection } from "./toggle-section.tsx"

function Showcase() {
  return (
    <>
      <h1>UI SDK Hello World</h1>
      <ToggleSection />
      <SettingsSection />
      <AgentSection />
    </>
  )
}

export { Showcase }
