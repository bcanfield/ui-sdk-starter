const regions = [
  { value: "virginia", label: "Virginia" },
  { value: "frankfurt", label: "Frankfurt" },
  { value: "tokyo", label: "Tokyo" },
]

const visibilities = [
  { value: "private", label: "Private" },
  { value: "internal", label: "Internal" },
  { value: "public", label: "Public" },
]

const PANE_TABS = "Project settings"

const itemsByControl: Record<string, { value: string; label: string }[]> = {
  Region: regions,
  Visibility: visibilities,
}

function itemLabel(control: string, value: unknown) {
  return itemsByControl[control]?.find((item) => item.value === value)?.label
}

export { itemLabel, PANE_TABS, regions, visibilities }
