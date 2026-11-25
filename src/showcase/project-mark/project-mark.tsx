"use client"

import { useFieldControl } from "@ui-sdk/react/field"
import { createParts } from "@ui-sdk/react/primitive"
import type { ComponentProps } from "react"
import { MARKS } from "./marks.ts"
import { projectMark, type ProjectMarkOptions } from "./project-mark.ts"
import "./project-mark.css"

const {
  Root,
  Trigger,
  Content,
  Search,
  List,
  Option,
  Empty,
} = createParts(projectMark, {
  root: "div",
  trigger: "button",
  content: "div",
  search: "input",
  list: "div",
  option: "button",
  empty: "p",
})

const ITEMS = MARKS.map(({ value, label, keywords }) => ({ value, label, keywords }))
const byValue = new Map(MARKS.map((mark) => [mark.value, mark]))

function MarkIcon({ value, ...props }: { value: string } & ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-mark-icon=""
      {...props}
    >
      <path d={byValue.get(value)?.path} />
    </svg>
  )
}

type ProjectMarkProps = Omit<ProjectMarkOptions, "items"> & { "aria-label"?: string }

function ProjectMark({ "aria-label": label, ...options }: ProjectMarkProps) {
  const field = useFieldControl()
  const named = field ? field.props({ "aria-label": label }) : { "aria-label": label ?? "Project mark" }
  return (
    <Root {...named} items={ITEMS} {...options}>
      {({ value }) => (
        <>
          <Trigger>
            <MarkIcon value={value} />
            <span>{byValue.get(value)?.label ?? "None"}</span>
          </Trigger>
          <Content side="bottom" align="start">
            <Search aria-label="Search marks" placeholder="Search marks" />
            <List aria-label="Marks">
              {({ results }) =>
                results.map((mark) => (
                  <Option key={mark} value={mark} aria-label={byValue.get(mark)?.label}>
                    <MarkIcon value={mark} />
                  </Option>
                ))
              }
            </List>
            <Empty>No marks match</Empty>
          </Content>
        </>
      )}
    </Root>
  )
}

export { ProjectMark }
