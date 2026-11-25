import { useRef } from "react"
import { Section } from "../sections/section.tsx"
import { AgentConsole } from "./agent-console.tsx"
import { AgentTrace } from "./agent-trace.tsx"
import { NowPlaying } from "./now-playing.tsx"
import { ProjectPane } from "./project-pane.tsx"
import { useAgentTrace } from "./use-agent-trace.ts"
import { useBridgeLock } from "./use-bridge-lock.ts"
import { usePaneHistory } from "./use-pane-history.ts"
import { useWide } from "./use-wide.ts"
import { defaultPacing, usePlanPlayer, type Pacing } from "./use-plan-player.ts"

function AgentRunSection({ pacing = defaultPacing }: { pacing?: Pacing }) {
  const runGrid = useRef<HTMLDivElement>(null)
  const paneWrap = useRef<HTMLDivElement>(null)
  const trace = useAgentTrace(paneWrap)
  const lock = useBridgeLock()
  const history = usePaneHistory(runGrid, lock)
  const player = usePlanPlayer(pacing, runGrid, { trace, onReset: history.clear, lock })
  const wide = useWide()
  return (
    <Section
      id="agent-run"
      title="Agent run"
      caption="scripted · no model · the real bridge"
    >
      {!wide && <NowPlaying player={player} />}
      <div className="run-grid" ref={runGrid}>
        <div className="pane-wrap" ref={paneWrap}>
          <ProjectPane key={player.paneKey} />
          {player.tracing && <AgentTrace traceRef={trace.ref} />}
        </div>
        <AgentConsole
          player={player}
          history={history}
          lock={lock}
          runGrid={runGrid}
          playHere={wide}
        />
      </div>
    </Section>
  )
}

export { AgentRunSection }
