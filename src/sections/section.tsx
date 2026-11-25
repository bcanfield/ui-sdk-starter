import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react"

type SectionProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "title" | "aria-labelledby" | "aria-describedby"
> & {
  title: string
  caption: string
  children: ReactNode
}

function Section({ title, caption, children, ...props }: SectionProps) {
  const headingId = useId()
  const captionId = useId()
  return (
    <section {...props} aria-labelledby={headingId} aria-describedby={captionId}>
      <div className="section-head">
        <h2 id={headingId}>{title}</h2>
        <p id={captionId} className="section-sub">
          {caption}
        </p>
      </div>
      {children}
    </section>
  )
}

export { Section }
