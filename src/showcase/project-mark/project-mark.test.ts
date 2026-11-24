import { checkDirection, checkPattern, mount } from "@ui-sdk/core/testing"
import { expect, test } from "vitest"
import { MARKS } from "./marks.ts"
import { projectMark } from "./project-mark.ts"

const items = MARKS.map(({ value, label, keywords }) => ({ value, label, keywords }))
const options = items.map((m) => `<option value="${m.value}">${m.label}</option>`).join("")
const markup = `<root aria-label="Project mark"><trigger>Mark</trigger><content><search aria-label="Search marks"></search><list aria-label="Marks">${options}</list><empty>No marks match</empty></content></root>`

function open(defaultValue = "rocket") {
  return mount(projectMark, { items, defaultValue }, markup)
}

type View = ReturnType<typeof open>
const focused = (view: View) => items.find((m) => view.part("option", m.value) === document.activeElement)?.value

test("opens on the trigger with focus in the search field", async () => {
  const view = open()
  try {
    await view.click(view.part("trigger")!)
    await view.settle()
    expect(view.state.open).toBe(true)
    expect(document.activeElement).toBe(view.part("search"))
  } finally {
    view.unmount()
  }
})

test("Down enters the grid; arrows, Home and End move by cell and row", async () => {
  const view = open("rocket")
  try {
    await view.click(view.part("trigger")!)
    await view.settle()
    await view.keys("ArrowDown")
    expect(focused(view)).toBe(items[0]!.value)
    await view.keys("ArrowRight")
    expect(focused(view)).toBe(items[1]!.value)
    await view.keys("ArrowLeft")
    expect(focused(view)).toBe(items[0]!.value)
    await view.keys("ArrowDown")
    expect(focused(view)).toBe(items[6]!.value)
    await view.keys("ArrowUp")
    expect(focused(view)).toBe(items[0]!.value)
    await view.keys("End")
    expect(focused(view)).toBe(items.at(-1)!.value)
    await view.keys("Home")
    expect(focused(view)).toBe(items[0]!.value)
    await view.keys("ArrowUp")
    expect(document.activeElement).toBe(view.part("search"))
    expect(view.part("list")!.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
  } finally {
    view.unmount()
  }
})

test("Enter on a mark chooses it, closes and returns focus to the trigger", async () => {
  const view = open("rocket")
  try {
    await view.click(view.part("trigger")!)
    await view.settle()
    await view.keys("ArrowDown", "ArrowRight", "Enter")
    await view.settle()
    expect(view.state.value).toBe(items[1]!.value)
    expect(view.changes.findLast((c) => c.key === "value")).toMatchObject({ key: "value", reason: "item-press", source: "keyboard" })
    expect(view.state.open).toBe(false)
    expect(document.activeElement).toBe(view.part("trigger"))
    expect(view.part("option", items[1]!.value)).toHaveAttribute("aria-selected", "true")
  } finally {
    view.unmount()
  }
})

test("Space selects the focused mark and keeps the picker open", async () => {
  const view = open("rocket")
  try {
    await view.click(view.part("trigger")!)
    await view.settle()
    await view.keys("ArrowDown", "ArrowRight", "Space")
    expect(view.state.value).toBe(items[1]!.value)
    expect(view.state.open).toBe(true)
    expect(view.part("option", items[0]!.value)).toHaveAttribute("aria-selected", "false")
  } finally {
    view.unmount()
  }
})

test("search narrows the marks by name and keyword, announces the count, and Enter picks the best", async () => {
  const view = open("leaf")
  try {
    await view.click(view.part("trigger")!)
    await view.settle()
    await view.type("launch")
    await view.settle()
    expect(view.part("option", "rocket")!.isConnected).toBe(true)
    expect(view.part("option", "leaf")!.isConnected).toBe(false)
    expect(view.announced.at(-1)).toBe("1 mark matches")
    expect(view.part("option", "rocket")).toHaveAttribute("data-best")

    await view.keys("Enter")
    await view.settle()
    expect(view.state.value).toBe("rocket")
    expect(view.state.open).toBe(false)
  } finally {
    view.unmount()
  }
})

test("a search with no match shows the empty line and announces it", async () => {
  const view = open()
  try {
    await view.click(view.part("trigger")!)
    await view.settle()
    await view.type("zzzz")
    await view.settle()
    expect(view.part("empty")!.isConnected).toBe(true)
    expect(view.announced.at(-1)).toBe("No marks match")
  } finally {
    view.unmount()
  }
})

test("reopening clears the last search", async () => {
  const view = open()
  try {
    await view.click(view.part("trigger")!)
    await view.settle()
    await view.type("launch")
    await view.keys("Escape")
    await view.settle()
    await view.click(view.part("trigger")!)
    await view.settle()
    expect(view.state.query).toBe("")
    expect(view.part("option", "leaf")!.isConnected).toBe(true)
  } finally {
    view.unmount()
  }
})

test("typing on a mark jumps to the next mark with that letter", async () => {
  const view = open()
  try {
    await view.click(view.part("trigger")!)
    await view.settle()
    await view.keys("ArrowDown", "l")
    expect(focused(view)).toBe("leaf")
  } finally {
    view.unmount()
  }
})

test("Escape closes and puts focus back on the trigger", async () => {
  const view = open()
  try {
    await view.click(view.part("trigger")!)
    await view.settle()
    await view.keys("ArrowDown", "Escape")
    await view.settle()
    expect(view.state.open).toBe(false)
    expect(document.activeElement).toBe(view.part("trigger"))
    expect(view.state.value).toBe("rocket")
  } finally {
    view.unmount()
  }
})

test("Left and Right swap in right-to-left text", async () => {
  await expect(
    checkDirection(
      projectMark,
    { items, defaultValue: "rocket", defaultOpen: true },
      `<root aria-label="Project mark"><content><list aria-label="Marks">${options}</list></content></root>`
    )
  ).resolves.toBeUndefined()
})

test("the open grid follows the listbox pattern", async () => {
  const view = open()
  try {
    await view.click(view.part("trigger")!)
    await view.settle()
    await expect(checkPattern(view.part("list")!, "listbox")).resolves.toBeUndefined()
  } finally {
    view.unmount()
  }
})

test("setValue refuses a mark that isn't in the set", () => {
  const view = open()
  try {
    expect(() => view.api.setValue("spaceship")).toThrow(/No mark "spaceship"/)
    view.api.setValue("leaf")
    expect(view.state.value).toBe("leaf")
  } finally {
    view.unmount()
  }
})
