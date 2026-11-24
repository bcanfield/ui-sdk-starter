import { Toggle } from "@ui-sdk/react/toggle"
import { Section } from "../sections/section.tsx"

function ToggleSection() {
  return (
    <Section
      title="First component"
      caption="Toggle is a behavior wrapped in a button: it keeps its own pressed state, handles Enter and Space, and sets aria-pressed with no code from you."
    >
      <Toggle>Bookmark</Toggle>
    </Section>
  )
}

export { ToggleSection }
