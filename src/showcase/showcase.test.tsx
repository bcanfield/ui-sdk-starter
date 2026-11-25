import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { agent } from "../agent.ts"
import { App } from "../App.tsx"
import pkg from "../../package.json"
import { gate, gateClosed, until } from "./run-kit.tsx"

const SENTENCE = "Changes who can see Apollo"
const setVisibility = (value: string, signal?: AbortSignal) =>
  agent.act(
    { steps: [{ ref: "Visibility", action: "setValue", args: [value] }] },
    { signal }
  )

test("the hero holds the page's only h1", () => {
  render(<App />)
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  expect(screen.getByRole("heading", { level: 1, name: "Built for agents" })).toBeInTheDocument()
})

test("the hero's first sentence says what ui-sdk is", () => {
  render(<App />)
  const lede = screen.getByRole("heading", { level: 1 }).nextElementSibling
  expect(lede?.textContent).toMatch(/^ui-sdk is [^.]+components[^.]+\./)
})

test("the eyebrow names the @ui-sdk/react version pinned in package.json", () => {
  render(<App />)
  const pinned = pkg.dependencies["@ui-sdk/react"]
  expect(pinned).toMatch(/^\d+\.\d+\.\d+/)
  expect(screen.getByText(`ui-sdk · ${pinned}`)).toBeInTheDocument()
})

test("every in-page pill leads to a section on the page", () => {
  const { container } = render(<App />)
  const pills = within(screen.getByRole("navigation", { name: "Sections" })).getAllByRole("link")
  const inPage = pills.map((pill) => pill.getAttribute("href")!).filter((href) => href.startsWith("#"))
  expect(inPage).toEqual(["#agent-run", "#core", "#repo"])
  for (const href of inPage) {
    expect(container.querySelector(`section${href}`), href).not.toBeNull()
  }
})

test("each section is a named region with a description", () => {
  render(<App />)
  const descriptions = ["Agent run", "Built from core", "In the repo"].map((name) => {
    const region = screen.getByRole("region", { name })
    expect(region).toHaveAccessibleDescription()
    return region
  })
  expect(descriptions[0]).toHaveAccessibleDescription("scripted · no model · the real bridge")
})

test("the footer lists the installed @ui-sdk packages and the docs", () => {
  render(<App />)
  // A footer inside main is not a contentinfo landmark in browsers, so find it by its text.
  const footer = screen.getByText(/^@ui-sdk\/react/).closest("footer")!
  expect(footer).toHaveTextContent(`@ui-sdk/react ${pkg.dependencies["@ui-sdk/react"]}`)
  expect(footer).toHaveTextContent(`@ui-sdk/core ${pkg.dependencies["@ui-sdk/core"]}`)
  for (const name of ["docs ↗", "source ↗", "ui-sdk.dev/web.md ↗", "agent tools ↗"]) {
    expect(within(footer).getByRole("link", { name })).toHaveAttribute("href", expect.stringMatching(/^https:/))
  }
})

test("an agent's risky step needs a person: refused on no, runs on yes", async () => {
  const user = userEvent.setup()
  render(<App />)
  const visibility = () => screen.getByRole("combobox", { name: "Visibility" })

  const refused = setVisibility("public")
  const ask = await gate()
  expect(ask).toHaveAccessibleDescription(SENTENCE)
  await user.click(screen.getByRole("button", { name: "Refuse" }))
  expect((await refused).error?.message).toMatch(/The person said no to/)
  expect(visibility()).toHaveTextContent("Private")

  const allowed = setVisibility("public")
  await user.click(within(await gate()).getByRole("button", { name: "Allow" }))
  expect((await allowed).ok).toBe(true)
  await until(() => expect(visibility()).toHaveTextContent("Public"))
})

test("aborting a step closes the prompt waiting on the person", async () => {
  render(<App />)
  const controller = new AbortController()

  const run = setVisibility("public", controller.signal)
  await gate()

  controller.abort()

  await gateClosed()
  expect((await run).ok).toBe(false)
  expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveTextContent(
    "Private"
  )
})
