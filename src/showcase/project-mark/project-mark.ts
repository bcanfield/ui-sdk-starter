import {
  announce,
  createChange,
  createPopup,
  createRovingFocus,
  createTypeahead,
  definePrimitive,
  isRTL,
  isTypeaheadKey,
  labelOf,
  popupContent,
  popupState,
  popupTrigger,
  type ChangeDetails,
} from "@ui-sdk/core"
import { popoverPreset } from "@ui-sdk/core/popover"
import { fuzzyScore } from "@ui-sdk/core/text-match"

const COLUMNS = 6

type MarkItem = { value: string; label: string; keywords?: string[] }

type ProjectMarkOptions = {
  items?: MarkItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: ChangeDetails<"item-press" | "imperative">) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails) => void
}

function rank(items: readonly MarkItem[], query: string) {
  const q = query.trim()
  if (!q) return items.map((item) => item.value)
  return items
    .map((item, index) => {
      const keyword = Math.max(0, ...(item.keywords ?? []).map((k) => fuzzyScore(k, q)))
      return { value: item.value, index, score: Math.max(fuzzyScore(item.label, q), keyword * 0.9) }
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((hit) => hit.value)
}

function matchCount(n: number) {
  if (n === 0) return "No marks match"
  return n === 1 ? "1 mark matches" : `${n} marks match`
}

const projectMark = definePrimitive({
  name: "project-mark",
  options: {
    items: "value",
    value: "string",
    defaultValue: "string",
    onValueChange: "callback",
    open: "boolean",
    defaultOpen: "boolean",
    onOpenChange: "callback",
  },
  controlled: ["value", "open"],
  state: (options: ProjectMarkOptions) => {
    const items = options.items ?? []
    return {
      ...popupState(options),
      items,
      value: options.value ?? options.defaultValue ?? items[0]?.value ?? "",
      query: "",
      results: items.map((item) => item.value),
      focused: null as string | null,
    }
  },
  sync: (options) => ({
    ...(options.value === undefined ? {} : { value: options.value }),
    ...(options.items === undefined ? {} : { items: options.items }),
  }),
  api: (context) => {
    const change = createChange(context)
    const popup = createPopup(context, { preset: popoverPreset })
    const typeahead = createTypeahead()
    const roving = createRovingFocus(context, {
      slot: "option",
      key: "focused",
      remember: false,
      preferred: (item) => item.key === context.store.get().value,
      claims: (state, item) => item.key === state.value,
      move: (event, { from, items }) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return
        // Read at key time, so a dir flip on any ancestor applies without a remount.
        const rtl = isRTL(from.el)
        const at = items.findIndex((item) => item.key === from.key)
        const to = {
          ArrowRight: rtl ? at - 1 : at + 1,
          ArrowLeft: rtl ? at + 1 : at - 1,
          ArrowDown: at + COLUMNS,
          ArrowUp: at - COLUMNS,
          Home: 0,
          End: items.length - 1,
        }[event.key]
        return to === undefined ? undefined : items[to]?.key
      },
    })

    const search = (query: string) => {
      const results = rank(context.store.get().items, query)
      context.store.set({ query, results })
      announce(matchCount(results.length))
    }

    let wasOpen = context.store.get().open
    context.store.subscribe(() => {
      const state = context.store.get()
      const opened = state.open && !wasOpen
      wasOpen = state.open
      if (opened && state.query) {
        context.store.set({ query: "", results: state.items.map((item) => item.value) })
      }
    })

    const choose = (value: string, event?: Event) => {
      change("value", value, { reason: "item-press", event })
      popup.setOpen(false, { reason: "item-press", event })
    }

    const focusSearch = () => context.element("search")?.focus()

    return {
      ...popup,
      roving,
      search,
      choose,
      allItems: () => context.store.get().items.map(({ value, label }) => ({ value, label })),
      setValue(value: string) {
        const items = context.store.get().items
        if (!items.some((item) => item.value === value)) {
          throw new Error(`No mark "${value}". Marks: ${items.map((item) => item.value).join(", ")}.`)
        }
        return change("value", value, { reason: "imperative" })
      },
      searchKeydown(event: KeyboardEvent) {
        const best = context.store.get().results[0]
        if (event.key === "ArrowDown" && best) {
          event.preventDefault()
          roving.focus(best)
        } else if (event.key === "Enter" && best) {
          event.preventDefault()
          choose(best, event)
        }
      },
      listKeydown(event: KeyboardEvent) {
        const el = event.target as HTMLElement
        const items = roving.items()
        const at = items.findIndex((item) => item.el === el)
        if (at === -1) return
        if (event.key === "ArrowUp" && at < COLUMNS) {
          event.preventDefault()
          focusSearch()
          return
        }
        if (event.key === " " && !typeahead.active()) {
          // Space selects and stays open, so a person can compare; Enter and a click choose and close.
          event.preventDefault()
          change("value", items[at]!.key, { reason: "item-press", event })
          return
        }
        if (isTypeaheadKey(event)) {
          event.preventDefault()
          const found = typeahead(event.key, items.map((item) => labelOf(item.el)), at)
          if (found >= 0) roving.focus(items[found]!.key)
          return
        }
        roving.keydown(event, el)
      },
    }
  },
  slots: (slot) => ({
    root: slot<{}, { value: string; open: boolean }>({
      role: "group",
      state: (state) => ({ value: state.value, open: state.open }),
    }),
    trigger: popupTrigger(slot),
    content: popupContent(slot),
    search: slot({
      attrs: (state, part) => ({
        type: "search",
        value: state.query,
        autocomplete: "off",
        spellcheck: "false",
        "aria-controls": `${part.id}-list`,
      }),
      on: {
        input: (event, { api }) => api.search((event.target as HTMLInputElement).value),
        keydown: (event, { api }) => api.searchKeydown(event as KeyboardEvent),
      },
    }),
    list: slot<{}, { results: string[]; query: string }>({
      role: "listbox",
      keys: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "typeahead"],
      state: (state) => ({ results: state.results, query: state.query }),
      attrs: (_state, part) => ({ id: `${part.id}-list`, "aria-orientation": "horizontal" }),
      on: { keydown: (event, { api }) => api.listKeydown(event as KeyboardEvent) },
    }),
    option: slot<{ value: string }>({
      props: { value: "string" },
      role: "option",
      focus: "roving",
      present: (state, part) => state.results.includes(part.key),
      attrs: (state, part) => ({
        type: "button",
        "aria-selected": String(state.value === part.key),
        tabindex: part.api.roving.tabIndex(state, part),
        "data-best": state.query && state.results[0] === part.key ? "" : undefined,
      }),
      press: ({ api, key }, event) => api.choose(key, event),
      bind: (el, part) => part.api.roving.bind(el, part),
    }),
    empty: slot({
      present: (state) => state.results.length === 0,
    }),
  }),
  agent: { actions: ["setValue"], closed: true, items: (api) => api.allItems() },
})

export { COLUMNS, projectMark, type MarkItem, type ProjectMarkOptions }
