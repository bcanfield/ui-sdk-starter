import { version } from "@ui-sdk/react/package.json"
import { DOCS, SOURCE } from "./links.ts"

const SECTIONS = [
  { href: "#agent-run", label: "watch the agent" },
  { href: "#core", label: "built from core" },
  { href: "#repo", label: "in the repo" },
] as const

function Hero() {
  return (
    <div className="hero">
      <p className="hero-eyebrow">ui-sdk · {version}</p>
      <h1>Built for agents</h1>
      <p className="hero-lede">
        <span className="nowrap">ui-sdk</span> is a library of unstyled components with keyboard,
        focus and ARIA built in, which an agent can use the way a person does. Watch one fill in
        the pane below, then undo only what it did.
      </p>
      <nav className="pills" aria-label="Sections">
        {SECTIONS.map((section) => (
          <a key={section.href} className="pill" href={section.href}>
            {section.label}
          </a>
        ))}
        <a className="pill" href={DOCS} target="_blank" rel="noreferrer">
          docs ↗
        </a>
        <a className="pill" href={SOURCE} target="_blank" rel="noreferrer">
          source ↗
        </a>
      </nav>
    </div>
  )
}

export { Hero }
