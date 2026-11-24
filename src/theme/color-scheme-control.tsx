import { Field, FieldLabel } from "@ui-sdk/react/field"
import { usePreference } from "@ui-sdk/react/preferences"
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control"
import { colorScheme } from "./color-scheme.ts"

const options = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const

function ColorSchemeControl() {
  const { value } = usePreference(colorScheme)
  return (
    <Field>
      <FieldLabel>Theme</FieldLabel>
      <SegmentedControl
        value={value}
        onValueChange={(next, details) => {
          if (next) colorScheme.set(next, { reason: details.reason })
        }}
      >
        <SegmentedControlIndicator />
        {options.map((option) => (
          <SegmentedControlItem key={option.value} value={option.value}>
            {option.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </Field>
  )
}

export { ColorSchemeControl }
