import "./showcase.css"
import { AgentRunSection } from "./agent-run-section.tsx"
import { CoreSection } from "./core-section.tsx"
import { RepoSection } from "./repo-section.tsx"

function Showcase() {
  return (
    <>
      <h1>UI SDK Hello World</h1>
      <AgentRunSection />
      <CoreSection />
      <RepoSection />
    </>
  )
}

export { Showcase }
