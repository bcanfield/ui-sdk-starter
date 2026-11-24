import "./showcase.css"
import { AgentRunSection } from "./agent-run-section.tsx"
import { CoreSection } from "./core-section.tsx"
import { Hero } from "./hero.tsx"
import { RepoSection } from "./repo-section.tsx"
import { SiteFooter } from "./site-footer.tsx"

function Showcase() {
  return (
    <>
      <Hero />
      <AgentRunSection />
      <CoreSection />
      <RepoSection />
      <SiteFooter />
    </>
  )
}

export { Showcase }
