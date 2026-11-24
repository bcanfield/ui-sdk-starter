import { useRef } from "react"
import { Section } from "../sections/section.tsx"
import { AgentConsole } from "./agent-console.tsx"
import { ProjectPane } from "./project-pane.tsx"
import { usePaneHistory } from "./use-pane-history.ts"
import { defaultPacing, usePlanPlayer, type Pacing } from "./use-plan-player.ts"

function AgentRunSection({ pacing = defaultPacing }: { pacing?: Pacing }) {
  const grid = useRef<HTMLDivElement>(null)
  const player = usePlanPlayer(pacing, grid)
  const history = usePaneHistory(grid, player.paneKey)
  return (
    <Section
      id="agent-run"
      title="Agent run"
      caption="Apollo's settings are real ui-sdk controls. A scripted agent and a person drive the same ones through the bridge."
    >
      <div className="run-grid" ref={grid}>
        <ProjectPane key={player.paneKey} />
        <AgentConsole player={player} history={history} paneRoot={grid} />
      </div>
    </Section>
  )
}

export { AgentRunSection }
