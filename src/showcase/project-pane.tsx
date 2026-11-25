import { Field, FieldLabel } from "@ui-sdk/react/field"
import { Input } from "@ui-sdk/react/input"
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "@ui-sdk/react/number-input"
import {
  PasswordInput,
  PasswordInputControl,
  PasswordInputToggle,
} from "@ui-sdk/react/password-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select"
import { Switch, SwitchThumb } from "@ui-sdk/react/switch"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs"
import { LABELS, PANE_TABS, regions, visibilities } from "./pane-items.ts"
import { ProjectMark } from "./project-mark/project-mark.tsx"

type Item = { value: string; label: string }

function SelectField({
  label,
  items,
  defaultValue,
  trace,
}: {
  label: string
  items: Item[]
  defaultValue: string
  trace: string
}) {
  return (
    <Field data-trace={trace}>
      <FieldLabel>{label}</FieldLabel>
      <Select defaultValue={defaultValue}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function ProjectPane() {
  return (
    <div className="pane" data-pane data-trace="pane">
      <Tabs defaultValue="general">
        <TabsList aria-label={PANE_TABS}>
          <TabsTab value="general" data-trace="tab:general">{LABELS.general}</TabsTab>
          <TabsTab value="notifications" data-trace="tab:notifications">
            {LABELS.notifications}
          </TabsTab>
        </TabsList>
        {/* keepMounted: the bridge switches tabs to reach a control, and an unmounted panel would drop the values set on it. */}
        <TabsPanel value="general" keepMounted data-trace-panel="general">
          <div className="fields">
            <Field data-trace="name">
              <FieldLabel>{LABELS.name}</FieldLabel>
              <Input defaultValue="Apollo" />
            </Field>
            <SelectField label={LABELS.region} items={regions} defaultValue="virginia" trace="region" />
            <Field data-trace="replicas">
              <NumberInput defaultValue={2} min={1} max={10}>
                <FieldLabel>{LABELS.replicas}</FieldLabel>
                <NumberInputGroup>
                  <NumberInputDecrement aria-label="Decrease" />
                  <NumberInputControl />
                  <NumberInputIncrement aria-label="Increase" />
                </NumberInputGroup>
              </NumberInput>
            </Field>
            <Field data-trace="mark">
              <FieldLabel>{LABELS.mark}</FieldLabel>
              <ProjectMark defaultValue="flag" />
            </Field>
            <div data-agent-confirm="Changes who can see Apollo">
              <SelectField
                label={LABELS.visibility}
                items={visibilities}
                defaultValue="private"
                trace="visibility"
              />
            </div>
          </div>
        </TabsPanel>
        <TabsPanel value="notifications" keepMounted data-trace-panel="notifications">
          <div className="fields">
            <Field className="inline" data-trace="digest">
              <Switch defaultChecked={false}>
                <SwitchThumb />
              </Switch>
              <FieldLabel>{LABELS.digest}</FieldLabel>
            </Field>
            <Field>
              <FieldLabel>{LABELS.token}</FieldLabel>
              <PasswordInput defaultValue="apollo-demo-token">
                <PasswordInputControl />
                <PasswordInputToggle aria-label="Show token" />
              </PasswordInput>
            </Field>
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  )
}

export { ProjectPane }
