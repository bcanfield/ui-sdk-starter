import { useId, type ReactNode } from "react"

type SectionProps = {
  title: string
  caption: string
  children: ReactNode
}

function Section({ title, caption, children }: SectionProps) {
  const headingId = useId()
  const captionId = useId()
  return (
    <section aria-labelledby={headingId} aria-describedby={captionId}>
      <h2 id={headingId}>{title}</h2>
      <p id={captionId} className="caption">
        {caption}
      </p>
      {children}
    </section>
  )
}

export { Section }
