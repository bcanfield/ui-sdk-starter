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
import { PANE_TABS, regions, visibilities } from "./pane-items.ts"
import { ProjectMark } from "./project-mark/project-mark.tsx"

function ProjectPane() {
  return (
    <div className="pane" data-pane data-trace="pane">
      <Tabs defaultValue="general">
        <TabsList aria-label={PANE_TABS}>
          <TabsTab value="general" data-trace="tab:general">General</TabsTab>
          <TabsTab value="notifications" data-trace="tab:notifications">Notifications</TabsTab>
        </TabsList>
        {/* keepMounted: the bridge switches tabs to reach a control, and an unmounted panel would drop the values set on it. */}
        <TabsPanel value="general" keepMounted data-trace-panel="general">
          <div className="fields">
            <Field data-trace="name">
              <FieldLabel>Project name</FieldLabel>
              <Input defaultValue="Apollo" />
            </Field>
            <Field data-trace="region">
              <FieldLabel>Region</FieldLabel>
              <Select defaultValue="virginia">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field data-trace="replicas">
              <NumberInput defaultValue={2} min={1} max={10}>
                <FieldLabel>Replicas</FieldLabel>
                <NumberInputGroup>
                  <NumberInputDecrement aria-label="Decrease" />
                  <NumberInputControl />
                  <NumberInputIncrement aria-label="Increase" />
                </NumberInputGroup>
              </NumberInput>
            </Field>
            <Field data-trace="mark">
              <FieldLabel>Project mark</FieldLabel>
              <ProjectMark defaultValue="flag" />
            </Field>
            <div data-agent-confirm="Changes who can see Apollo">
              <Field data-trace="visibility">
                <FieldLabel>Visibility</FieldLabel>
                <Select defaultValue="private">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilities.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        </TabsPanel>
        <TabsPanel value="notifications" keepMounted data-trace-panel="notifications">
          <div className="fields">
            <Field className="inline" data-trace="digest">
              <Switch defaultChecked={false}>
                <SwitchThumb />
              </Switch>
              <FieldLabel>Weekly digest</FieldLabel>
            </Field>
            <Field>
              <FieldLabel>Deploy token</FieldLabel>
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
