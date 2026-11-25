import { Button } from "@ui-sdk/react/button"
import { plan, STEP_STATUS, TASK } from "./plan.ts"
import type { PlanPlayer } from "./use-plan-player.ts"

function PlayButtons({ player }: { player: PlanPlayer }) {
  const blocked = player.running || player.finished || player.held
  return (
    <>
      <Button onClick={player.run} disabled={blocked}>
        Run
      </Button>
      <Button onClick={player.step} disabled={blocked}>
        Step
      </Button>
      <Button onClick={player.stop} disabled={!player.running}>
        Stop
      </Button>
    </>
  )
}

function NowPlaying({ player }: { player: PlanPlayer }) {
  const step = plan[player.active]
  const state = step ? player.rows[player.active]!.state : "idle"
  return (
    <fieldset className="now-playing" aria-label="Now playing" data-agent-hidden>
      <span className="now-playing-count">
        {step ? `${player.active + 1}/${plan.length}` : `${plan.length} steps`}
      </span>
      <span className="now-playing-status" data-state={state}>
        {STEP_STATUS[state]}
      </span>
      <span className="now-playing-say" data-state={state}>
        {step ? step.say : TASK}
      </span>
      <div className="now-playing-buttons">
        <PlayButtons player={player} />
      </div>
    </fieldset>
  )
}

export { NowPlaying, PlayButtons }
