import { useRef } from "react"
import { Section } from "../sections/section.tsx"
import { AgentConsole } from "./agent-console.tsx"
import { AgentTrace } from "./agent-trace.tsx"
import { NowPlaying } from "./now-playing.tsx"
import { ProjectPane } from "./project-pane.tsx"
import { useAgentTrace } from "./use-agent-trace.ts"
import { usePaneHistory } from "./use-pane-history.ts"
import { useWide } from "./use-wide.ts"
import { defaultPacing, usePlanPlayer, type Pacing } from "./use-plan-player.ts"

function AgentRunSection({ pacing = defaultPacing }: { pacing?: Pacing }) {
  const grid = useRef<HTMLDivElement>(null)
  const paneWrap = useRef<HTMLDivElement>(null)
  const trace = useAgentTrace(paneWrap)
  const player = usePlanPlayer(pacing, grid, trace)
  const history = usePaneHistory(grid, player.paneKey)
  const tracing = player.active >= 0 && !player.finished
  const wide = useWide()
  return (
    <Section
      id="agent-run"
      title="Agent run"
      caption="scripted · no model · the real bridge"
    >
      {!wide && <NowPlaying player={player} />}
      <div className="run-grid" ref={grid}>
        <div className="pane-wrap" ref={paneWrap}>
          <ProjectPane key={player.paneKey} />
          {tracing && <AgentTrace traceRef={trace.ref} />}
        </div>
        <AgentConsole player={player} history={history} paneRoot={grid} playHere={wide} />
      </div>
    </Section>
  )
}

export { AgentRunSection }
