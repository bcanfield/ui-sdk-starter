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
        Watch a scripted agent drive real <span className="nowrap">ui-sdk</span> controls, change
        anything yourself, then undo only what the agent did.
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
