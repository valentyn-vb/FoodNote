# UI library decisions

shadcn/ui is the component vocabulary. Nothing below gets installed up front — a library is added in the ticket whose designed interaction needs it, and the wireframe annotation is the evidence.

## Use when the screen calls for it

| Library          | Where in FoodNote                                                                      | Install                         |
| ---------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| NumberFlow       | calorie/macro totals and progress numbers that change meaningfully (not per keystroke) | `npm i @number-flow/react`      |
| Sonner           | "Meal saved", delete + undo — non-blocking toasts; hard failures stay inline           | `npx shadcn@latest add sonner`  |
| Drawer (Base UI) | mobile meal editing / serving selection without leaving context                        | `npx shadcn@latest add drawer`  |
| cmdk (Command)   | food search with recents + grouped results                                             | `npx shadcn@latest add command` |

## Only if the flow proves the need

- `input-otp` — only if OTP auth ships
- `dnd-kit` — only if reordering meals/items is essential
- `react-virtuoso` — only for genuinely large/unbounded lists (history/search)
- `liveline` — only for truly real-time charts; daily weight/calorie trends are not real-time

## Do not use

- **Vaul** — unmaintained; shadcn's Drawer moved to Base UI
- **Leva** — developer control panel, not product UI

## Added

- **EvilCharts** (`evilcharts.com` shadcn registry, recharts-based, MIT) — dashboard weight-trend line + 7-day calorie bars, themed with FoodNote tokens. Chosen by Jerry 2026-07-14; components land as reviewable source in `frontend/src/components/evilcharts/`.
