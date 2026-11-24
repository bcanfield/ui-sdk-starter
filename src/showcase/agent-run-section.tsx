import { Section } from "../sections/section.tsx"
import { ProjectPane } from "./project-pane.tsx"

function AgentRunSection() {
  return (
    <Section
      id="agent-run"
      title="Agent run"
      caption="Apollo's settings are real ui-sdk controls. A person and an agent drive the same ones through the bridge."
    >
      <ProjectPane />
    </Section>
  )
}

export { AgentRunSection }
