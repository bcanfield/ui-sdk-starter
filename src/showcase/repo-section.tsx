import { useId } from "react"
import { Section } from "../sections/section.tsx"
import { sourceFile, TESTING_DOCS } from "./links.ts"
import paneTest from "./project-pane.test.tsx?raw"
import "./repo-section.css"

const PANE_TEST = "src/showcase/project-pane.test.tsx"
const MARK_TEST = sourceFile("src/showcase/project-mark/project-mark.test.ts")

const STRIP_FOLDER = "src/showcase/"
const STRIP_IMPORT = "Showcase"
const STRIP_LINE = "<Showcase />"
const STRIP_FILE = "src/App.tsx"
const STRIP_TAIL = "pnpm check"

// The README "Start" paragraph says this too, word for word.
const STRIP = `delete the ${STRIP_FOLDER} folder, the ${STRIP_IMPORT} import and the ${STRIP_LINE} line in ${STRIP_FILE}, then run ${STRIP_TAIL}.`

const HELPERS = [
  { name: "mount", does: "renders a primitive's parts and drives them like a user", href: MARK_TEST, used: true },
  { name: "checkDirection", does: "arrow keys follow the reading direction", href: MARK_TEST, used: true },
  { name: "checkPattern", does: "roles, names, states and keys match an ARIA pattern", href: MARK_TEST, used: true },
  { name: "checkServer", does: "creating the primitive reads no browser globals", href: TESTING_DOCS, used: false },
]

function excerpt(source: string) {
  const start = source.indexOf("// excerpt:start")
  const end = source.indexOf("// excerpt:end")
  if (start < 0 || end < start) return ""
  return source.slice(source.indexOf("\n", start) + 1, end).trim()
}

const EXCERPT = excerpt(paneTest)

function RepoSection() {
  const helpersId = useId()
  return (
    <Section id="repo" title="In the repo" caption="the real test file · read at build">
      <p className="section-lede">
        This is the project pane&apos;s own test, read from the file when the page
        builds. It drives the pane through the same agent bridge the run uses, then
        opens General again to check nothing was lost while the agent was on the
        other tab.
      </p>

      <figure className="repo-figure">
        <figcaption>
          <a href={sourceFile(PANE_TEST)} target="_blank" rel="noreferrer">
            {PANE_TEST} ↗
          </a>
        </figcaption>
        <pre aria-label="Agent test excerpt">
          <code>{EXCERPT}</code>
        </pre>
      </figure>

      <p id={helpersId} className="eyebrow repo-eyebrow">
        Testing helpers
      </p>
      <ul aria-labelledby={helpersId} className="repo-helpers">
        {HELPERS.map((helper) => (
          <li key={helper.name}>
            <a href={helper.href} target="_blank" rel="noreferrer">
              {helper.name}
            </a>
            <span>
              {helper.does}
              {helper.used ? "" : ". Not used here yet, so this links the docs."}
            </span>
          </li>
        ))}
      </ul>

      <p className="eyebrow repo-eyebrow">Strip the showcase</p>
      <p className="repo-strip">
        Delete the <code>{STRIP_FOLDER}</code> folder, the <code>{STRIP_IMPORT}</code> import and
        the <code>{STRIP_LINE}</code> line in <code>{STRIP_FILE}</code>, then run{" "}
        <code>{STRIP_TAIL}</code>.
      </p>
    </Section>
  )
}

export { RepoSection, STRIP }
