import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs"
import { Toggle } from "@ui-sdk/react/toggle"
import { useId } from "react"
import { Section } from "../sections/section.tsx"
import { sourceFile } from "./links.ts"
import { ProjectMark } from "./project-mark/project-mark.tsx"
import { useUrlParam } from "./use-url-param.ts"
import "./core-section.css"

const MARK_SOURCE = sourceFile("src/showcase/project-mark/project-mark.ts")

const LEGEND = [
  { keys: ["↑", "↓", "←", "→"], does: "move between marks" },
  { keys: ["Home", "End"], does: "first and last mark" },
  { keys: ["a–z"], does: "search, or jump by name in the grid" },
  { keys: ["Space"], does: "select and keep open" },
  { keys: ["Enter"], does: "choose and close" },
  { keys: ["Esc"], does: "close, focus back on the button" },
]

const RANGES = [
  { value: "day", label: "Day", note: "24 hourly buckets." },
  { value: "week", label: "Week", note: "7 daily buckets." },
  { value: "month", label: "Month", note: "30 daily buckets." },
]

const toRtl = (raw: string | null) => raw === "rtl"
const fromRtl = (rtl: boolean) => (rtl ? "rtl" : null)

function CoreSection() {
  const legendId = useId()
  const [rtl, setRtl] = useUrlParam("dir", toRtl, fromRtl)

  return (
    <Section
      id="core"
      className="core"
      dir={rtl ? "rtl" : undefined}
      title="Built from core"
      caption="definePrimitive · not shipped by ui-sdk"
    >
      <p className="section-lede">
        ui-sdk doesn't ship a project mark picker, so this page builds one from
        @ui-sdk/core: a popover, one tab stop with arrows across the grid,
        fuzzy search and announcements. Flip the direction and its arrows
        follow, like the shipped Tabs beside it.
      </p>

      <div className="core-demo">
        <ProjectMark aria-label="Sample mark" defaultValue="leaf" />
        <Tabs defaultValue="week">
          <TabsList aria-label="Range">
            {RANGES.map((range) => (
              <TabsTab key={range.value} value={range.value}>
                {range.label}
              </TabsTab>
            ))}
            <TabsIndicator />
          </TabsList>
          {RANGES.map((range) => (
            <TabsPanel key={range.value} value={range.value} className="core-range-note">
              {range.note}
            </TabsPanel>
          ))}
        </Tabs>
      </div>

      <div className="core-meta">
        <Toggle
          pressed={rtl}
          onPressedChange={setRtl}
        >
          Right to left
        </Toggle>
        <a href={MARK_SOURCE} target="_blank" rel="noreferrer">
          project-mark.ts source ↗
        </a>
      </div>

      <p id={legendId} className="eyebrow core-eyebrow">
        Keyboard
      </p>
      <ul aria-labelledby={legendId} className="core-legend">
        {LEGEND.map((row) => (
          <li key={row.does}>
            <span className="core-keys">
              {row.keys.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </span>
            <span>{row.does}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export { CoreSection }
