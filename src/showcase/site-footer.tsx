import { version as coreVersion } from "@ui-sdk/core/package.json"
import { version as reactVersion } from "@ui-sdk/react/package.json"
import { AGENT_TOOLS, DOCS, SOURCE, WEB_MD } from "./links.ts"

const LINKS = [
  { href: DOCS, label: "docs" },
  { href: SOURCE, label: "source" },
  { href: WEB_MD, label: "ui-sdk.dev/web.md" },
  { href: AGENT_TOOLS, label: "agent tools" },
] as const

function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer-row">
        <span>@ui-sdk/react {reactVersion}</span>
        <span aria-hidden="true">·</span>
        <span>@ui-sdk/core {coreVersion}</span>
      </p>
      <p className="site-footer-row">
        {LINKS.map((link, index) => (
          <span key={link.href} className="site-footer-item">
            {index > 0 && <span aria-hidden="true">/</span>}
            <a href={link.href} target="_blank" rel="noreferrer">
              {link.label} ↗
            </a>
          </span>
        ))}
      </p>
    </footer>
  )
}

export { SiteFooter }
