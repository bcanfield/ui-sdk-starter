import { useId, type ReactNode } from "react"

type SectionProps = {
  id?: string
  title: string
  caption: string
  children: ReactNode
}

function Section({ id, title, caption, children }: SectionProps) {
  const headingId = useId()
  const captionId = useId()
  return (
    <section id={id} aria-labelledby={headingId} aria-describedby={captionId}>
      <h2 id={headingId}>{title}</h2>
      <p id={captionId} className="caption">
        {caption}
      </p>
      {children}
    </section>
  )
}

export { Section }
