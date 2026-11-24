import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ui-sdk/react/alert-dialog"
import { Button } from "@ui-sdk/react/button"
import { Field, FieldLabel } from "@ui-sdk/react/field"
import { Input } from "@ui-sdk/react/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select"
import { Switch, SwitchThumb } from "@ui-sdk/react/switch"
import { useState, type FormEvent } from "react"
import { Section } from "./section.tsx"

function SettingsSection() {
  const [name, setName] = useState("Apollo")
  const [saved, setSaved] = useState("")

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const digest = data.has("digest") ? "on" : "off"
    setSaved(
      `Saved ${data.get("name") as string}: ${data.get("visibility") as string}, weekly digest ${digest}`
    )
  }

  return (
    <Section
      title="Settings form"
      caption="Field wires a label to its Input, Select and Switch, so every control has an accessible name and submits with its form."
    >
      <form onSubmit={save}>
        <Field name="name">
          <FieldLabel>Project name</FieldLabel>
          <Input value={name} onValueChange={setName} required />
        </Field>
        <Field>
          <FieldLabel>Visibility</FieldLabel>
          <Select name="visibility" defaultValue="private">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field className="inline">
          <Switch name="digest" defaultChecked>
            <SwitchThumb />
          </Switch>
          <FieldLabel>Weekly digest</FieldLabel>
        </Field>
        <Button type="submit">Save settings</Button>
      </form>
      <AlertDialog
        onOpenChange={(open, details) => {
          if (!open && details.returnValue === "confirm") {
            setSaved(`${name} was deleted`)
          }
        }}
      >
        <AlertDialogTrigger>Delete project</AlertDialogTrigger>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the project and all its data.
          </AlertDialogDescription>
          <AlertDialogClose>Cancel</AlertDialogClose>
          <AlertDialogClose
            value="confirm"
            data-agent-confirm="Deletes the project and all its data"
          >
            Delete forever
          </AlertDialogClose>
        </AlertDialogContent>
      </AlertDialog>
      <output aria-label="Settings result">{saved}</output>
    </Section>
  )
}

export { SettingsSection }
