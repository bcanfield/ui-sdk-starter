import { MARKS } from "./project-mark/marks.ts"

type Item = { value: string; label: string }

const regions: Item[] = [
  { value: "virginia", label: "Virginia" },
  { value: "frankfurt", label: "Frankfurt" },
  { value: "tokyo", label: "Tokyo" },
]

const visibilities: Item[] = [
  { value: "private", label: "Private" },
  { value: "internal", label: "Internal" },
  { value: "public", label: "Public" },
]

const PANE_TABS = "Project settings"

const LABELS = {
  name: "Project name",
  region: "Region",
  replicas: "Replicas",
  mark: "Project mark",
  visibility: "Visibility",
  digest: "Weekly digest",
  token: "Deploy token",
  general: "General",
  notifications: "Notifications",
} as const

const itemsByControl: Record<string, Item[]> = {
  [LABELS.region]: regions,
  [LABELS.visibility]: visibilities,
  [LABELS.mark]: MARKS,
}

// Tab switches are the bridge reaching behind a closed tab, not edits a person made or the plan asked for.
const isTabSwitch = (entry: { label?: string }) => entry.label === PANE_TABS

function itemLabel(control: string, value: unknown) {
  return itemsByControl[control]?.find((item) => item.value === value)?.label
}

export { isTabSwitch, itemLabel, LABELS, PANE_TABS, regions, visibilities, type Item }
