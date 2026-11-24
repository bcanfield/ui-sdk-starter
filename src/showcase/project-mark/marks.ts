type Mark = {
  value: string
  label: string
  keywords: string[]
  path: string
}

const MARKS: Mark[] = [
  {
    value: "rocket",
    label: "Rocket",
    keywords: ["launch", "ship", "space"],
    path: "M12 2c3 2.5 4.5 6 4.5 10l-2 4h-5l-2-4C7.5 8 9 4.5 12 2Zm0 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM9.5 16 7 19v2l3.5-2M14.5 16l2.5 3v2l-3.5-2",
  },
  {
    value: "bolt",
    label: "Bolt",
    keywords: ["fast", "power", "energy"],
    path: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  },
  {
    value: "leaf",
    label: "Leaf",
    keywords: ["nature", "plant", "eco"],
    path: "M5 19C5 10 10 5 20 4c-1 10-6 15-15 15Zm0 0 8-8",
  },
  {
    value: "flame",
    label: "Flame",
    keywords: ["fire", "hot", "burn"],
    path: "M12 22c-4 0-7-3-7-7 0-4 3-6 4-10 2 2 3 4 3 6 1-1 2-2 2-4 3 2 5 5 5 8 0 4-3 7-7 7Z",
  },
  {
    value: "star",
    label: "Star",
    keywords: ["favorite", "top"],
    path: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z",
  },
  {
    value: "moon",
    label: "Moon",
    keywords: ["night", "sleep"],
    path: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  },
  {
    value: "sun",
    label: "Sun",
    keywords: ["day", "bright"],
    path: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",
  },
  {
    value: "cloud",
    label: "Cloud",
    keywords: ["sky", "weather"],
    path: "M7 19a5 5 0 0 1-.5-10A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1-.5 9.5H7Z",
  },
  {
    value: "gem",
    label: "Gem",
    keywords: ["diamond", "value"],
    path: "M6 3h12l4 6-10 12L2 9l4-6Zm-4 6h20M12 21 8 9l4-6 4 6-4 12",
  },
  {
    value: "anchor",
    label: "Anchor",
    keywords: ["harbor", "port"],
    path: "M12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 0v13m-7-8a7 7 0 0 0 14 0M8 11h8",
  },
  {
    value: "flag",
    label: "Flag",
    keywords: ["goal", "finish"],
    path: "M5 22V3m0 1h12l-2 4 2 4H5",
  },
  {
    value: "globe",
    label: "Globe",
    keywords: ["world", "earth"],
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-10 10h20M12 2c3 3 4 6.5 4 10s-1 7-4 10c-3-3-4-6.5-4-10s1-7 4-10Z",
  },
]

export { MARKS, type Mark }
