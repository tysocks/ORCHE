# ORCHE — Work Instruction Runner

ORCHE is a local web app for running manufacturing work instructions written in Obsidian-compatible Markdown. Operators follow steps, capture structured inputs, and complete operations in sequence. Instruction templates live in Git; runtime data is stored as append-only events on disk.

## Requirements

- **Node.js** 20+ (LTS recommended)
- **npm** (included with Node.js)

## Quick start

```bash
cd orche-runner
npm install
npm run dev
```

Open **http://localhost:5173** in a browser.

The dev server runs two processes:

| Service | Port | Role |
|--------|------|------|
| UI (Vite) | 5173 | Operator interface |
| API (Express) | 5174 | Reads/writes `instruction-library/` and `work-orders/` |

Production build:

```bash
cd orche-runner
npm run build
npm run preview
```

## Repository layout

```
ORCHE/
├── instruction-library/     # Git-backed templates (author in Obsidian)
│   └── <part-number>/
│       └── <routing>/       # e.g. ASSY
│           ├── routing.md
│           ├── OP-000001 - Demo Assembly.md
│           └── OP-000001 - Demo Assembly.assets/
├── work-orders/             # Runtime data (not committed; one folder per WO)
│   └── WO-YYYYMMDD-####/
├── orche-runner/            # React UI + Express API
└── dev notes/               # Design and milestone notes
```

## Operator guide

### 1. Set your profile (required)

1. Open the app and click the **menu** (☰) in the top-left.
2. Choose **Profile**.
3. Enter **Operator name** and **Shift** (Day / Evening / Night).
4. Close the panel. A dot on the menu icon means the profile is incomplete.

Profile is stored in the browser (`localStorage`) and is sent with every process event.

### 2. Home — find or create a work order

**Search** (filters combine; all non-empty fields must match):

- Work order ID (e.g. `WO-20260527-0001`)
- Part number (e.g. `E02-XXXXX`)
- Serial number
- Routing code appears on each row (e.g. `ASSY`)

**Create:** click **+ New work order**, pick part number, routing, and serial number. IDs are generated as `WO-YYYYMMDD-####` unless you specify one.

Click a row to open the work order.

**Navigation icons (top bar):**

- **☰ Menu** — Profile and Preferences (light/dark theme).
- **Home** — return to the work order list (shown on work order, operation, and summary screens).

### 3. Work order — routing (same layout as an operation)

The work order screen uses the **same header pattern** as the operation runner:

- **Home** pill (left) — return to the work order list
- Title, part/serial/routing, operation progress, operator
- **Complete work order** (check) — enabled when **all operations** are signed off; records `work_order_completed`
- **Summary** — full work order summary view
- **Menu** (⋮) — dropdown:
  - **Add Operation** — ad-hoc row (title, operation no., operation ID); list order follows **operation number** (e.g. `1.5` between `1` and `2`); **no routing dependency** (`Next Operation No` left blank); logged in action log
  - **Delete Operation** — remove an operation only if it has **no** completed steps, inputs, notes, or sign-off; confirmation required; logged in action log
  - **Action Log** — side panel, timeline grouped by operation (collapsed by default)
  - **Tool Log** — side panel, required tools for all operations (collapsed by default)
  - **Notes** — side panel, notes per operation (collapsed by default)
  - **Operation Hierarchy** — dependency links from the routing table

Operations are listed in the main body. Each row shows operation number, name, `OP-######` ID, type tag, and status icon. Operations are **blocked** until the previous operation in the routing chain is completed. Footer prompts when all operations are complete but the work order is not yet signed off.

Each screen has its own **URL**, so you can use normal **Chrome tabs**:

| View | Example URL |
|------|-------------|
| Home | `http://localhost:5173/` |
| Work order | `http://localhost:5173/?wo=WO-LOCAL-DEMO` |
| Operation | `http://localhost:5173/?wo=WO-LOCAL-DEMO&op=10` |
| Summary | `http://localhost:5173/?wo=WO-LOCAL-DEMO&summary=1` |

**Ctrl+click** (or **Cmd+click** on Mac) an operation, or **middle-click**, to open it in a **new browser tab**. Right-click → **Open link in new tab** works too. Each tab is an independent instance.

### 5. Operation runner — steps

**Top bar**

- **Work order pill** (left) — return to the operations list.
- Operation title and progress (`completed / total` steps).
- **Complete operation** (check) — enabled only when **all steps** are complete; does not auto-complete when the last step is finished.
- **Tools** (wrench) — side panel with a **summary table** of required tools (frontmatter + equipment captured on steps).
- **Menu** (⋮) — dropdown:
  - **Action Log** — side panel, timestamped audit for this operation
  - **Notes** — side panel, notes in step/action order

**Action log** (⋮ → Action Log)

Every operator action on the open operation is appended to `process-events.jsonl` and shown newest-first in the log:

| Event | What you see |
|-------|----------------|
| Input updated | Field label, previous → new value (Pass/Fail labels when configured) |
| Section/step completed | Step title and captured input snapshot |
| Section/step reopened | Step marked incomplete again |
| Note saved | Step/action and note text |
| Operation completed / reopened | Operation-level sign-off |

Each entry includes **timestamp** and **operator (shift)**. Use this to verify changes after uncompleting a step, editing inputs, and completing again.

**Each step**

- Instruction text (Markdown, callouts, images).
- **Inputs** — text, number, textarea, select, or Yes/No (`checkbox` type).
- **Toolbar** (sticky while scrolling the step):
  - **Complete** — marks step done; shows operator name when complete.
  - **Note** — open to view or edit a step note (no preview until the note button is used).
  - **Next** — scroll to the next incomplete step.

Steps cannot be completed until required inputs are filled and profile is set.

### 6. Work order summary

From the work order screen, open **Summary** to see:

- Work order metadata and status
- Start/end and estimated/actual times
- Per-operation status and captured inputs

## Authoring instructions (Obsidian / Markdown)

### Folder structure

Place templates under:

`instruction-library/<PART>/<ROUTING>/`

Example: `instruction-library/E02-XXXXX/ASSY/`

### Routing table

File: `routing.md`

```markdown
| Operation No | Operation ID | Operation Name | Next Operation No |
| ------------ | ------------ | -------------- | ----------------- |
| 1            | OP-000001    | Demo Assembly  | 2                 |
| 2            | OP-000002    | Demo Test      |                   |
```

- **Operation No** — sequence number used on the work order.
- **Operation ID** — must match the operation file’s `op_id` in frontmatter.
- **Next Operation No** — dependency; the next op stays blocked until this one is completed.

### Operation template

File name should include the op ID, e.g. `OP-000001 - Demo Assembly.md`.

**YAML frontmatter:**

```yaml
---
op_id: OP-000001
operation_type: instruction
default_title: Demo Assembly
estimated_minutes: 15
schema_version: 1
---
```

Add a dedicated `required_tools` block near the top of the Markdown body (outside frontmatter). ORCHE consumes this block for tooling data and does **not render it** in the instruction body.

~~~markdown
```required_tools
- Torque wrench (calibrated)
- description: Digital caliper
  part_number: CAL-001
  equipment_id: EQ-42
```
~~~

`required_tools` entries accept plain strings or objects with `description`, `part_number`, and `equipment_id`. The runner shows them in a table (Description, Part no., Equipment ID, Source).

**Equipment inputs** on steps are also listed in the tools table when the operator records values:

```json
{"id":"torque_gun","type":"equipment","label":"Torque gun","part_number":"TG-200","equipment_id":"EQ-17","required":true}
```

**Operation types** (`operation_type`):

| Value | Use case | UI |
|-------|----------|-----|
| `instruction` (default) | Assembly / detailed work instructions | Full step cards with Markdown body, images, and callouts |
| `checklist` | Rocket engine test campaigns and other condensed sequences | Hierarchical list: one complete control per section (`X.0`), compact action rows (`X.Y`) with inline inputs |

Example checklist frontmatter:

```yaml
---
op_id: OP-000010
operation_type: checklist
default_title: Pre-Test Checklist
estimated_minutes: 20
schema_version: 1
---
```

Content before the first `##` heading is parsed but **not shown** in the runner (operation title/description are taken from routing + frontmatter).

### Steps (instruction operations)

Use level-2 headings:

```markdown
## Step 1 — Identify unit

Instruction text here.
```

### Checklist structure

For `operation_type: checklist`, use **numbered section headers** instead of `## Step N`:

~~~markdown
## 1.0 Test cell access

## 1.1 Test cell clear of personnel (y/n)

```orche-input
{"id":"cell_clear","type":"checkbox","label":"","required":true}
```

## 2.0 Grounding and ESD

## 2.1 Grounding verified (y/n)

```orche-input
{"id":"ground_ok","type":"checkbox","label":"","required":true}
```
~~~

- **`X.0`** — section title only (no checkbox). Optional note text may appear under the header.
- **`X.Y`** where `Y > 0` — action row: number, title, inline inputs, and optional note (no separate complete control).
- **Complete** — one button on each **`X.0`** section header; marks the whole section when all actions in that section have valid inputs.
- Append **`(y/n)`** to the title for yes/no items; the runner strips it from the display title.
- For `checkbox` inputs, use an empty `label` for a compact **Y / N** toggle, or set **`options`** for custom left/right labels (left = true, right = false):

```json
{"id":"ground_ok","type":"checkbox","label":"","required":true,"options":["Pass","Fail"]}
```
- Step IDs are derived from the number and title (e.g. `check_1_1_test_cell_clear_of_personnel`).

### Structured inputs

Embed JSON in a fenced block with language `orche-input`:

~~~markdown
```orche-input
{"id":"serial_number","type":"text","label":"Serial number","required":true}
```
~~~

Supported `type` values:

| type | UI |
|------|-----|
| `text` | Single-line text |
| `number` | Numeric input |
| `textarea` | Multi-line text |
| `select` | Dropdown (`options` array required) |
| `checkbox` | Two-option toggle (default Y/N or Yes/No; optional `options`: `["Pass","Fail"]`, left = true) |
| `equipment` | Description, part number, and equipment ID (optional defaults from JSON; values stored in events and shown under **Tools**) |

### Callouts (Obsidian-style)

```markdown
> [!warning] Custom title
> Body line one
> Body line two

> [!tip]
> Optional title omitted — a default label is shown
```

Supported types include `note`, `info`, `tip`, `warning`, `success`, `danger`, `example`, and others; each has distinct colors in light and dark mode.

### Images and assets

Put files beside the operation markdown:

`OP-000001 - Demo Assembly.assets/image.png`

Reference with standard Markdown or wiki links:

```markdown
![[OP-000001 - Demo Assembly.assets/image.png|Alt text]]
```

```markdown
![](OP-000001%20-%20Demo%20Assembly.assets/assembly-reference.svg)
```

## Runtime data (work orders)

Each work order is a folder under `work-orders/<WO-ID>/`:

| File | Purpose |
|------|---------|
| `work-order.md` | Metadata (part, serial, routing, status, times) |
| `routing.md` | Snapshot of routing for this order |
| `template-refs.json` | Links operations to library template paths |
| `process-events.jsonl` | Append-only event log (source of truth) |
| `attachments/` | Optional operator uploads |

### Event kinds (summary)

- `input_changed` — field edited
- `step_completed` / `step_uncompleted` — step state
- `step_note` — note text for a step
- `operation_completed` / `operation_uncompleted` — manual operation completion

Events include `operatorName`, `workShift`, `operationNo`, and `opId`.

## API (local development)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/work-orders` | List work orders with metadata |
| POST | `/api/work-orders` | Create work order from routing |
| GET | `/api/work-orders/:id` | Work order + operations |
| GET | `/api/work-orders/:id/events` | Event log |
| POST | `/api/work-orders/:id/events` | Append event |
| GET | `/api/work-orders/:id/summary` | Summary view data |
| GET | `/api/operation?path=...` | Parsed operation template |
| GET | `/api/library-asset?path=...` | Image/file from library |
| GET | `/api/library/parts` | Part numbers |
| GET | `/api/library/parts/:part/routings` | Routings for a part |

## Demo content

The repo includes a sample library:

| Routing | Operations | Type |
|---------|------------|------|
| `ASSY` | `OP-000001` Demo Assembly, `OP-000002` Demo Test | Instruction |
| `TEST` | `OP-000010` Pre-Test Checklist, `OP-000011` Hot Fire Test Checklist | Checklist |

**Seed demo work orders** (local only, gitignored):

```bash
cd orche-runner
npx tsx scripts/seed-demo-work-orders.ts
```

Creates:

- `WO-LOCAL-DEMO` — `TEST` routing (checklist operations)
- `WO-DEMO-ASSY` — `ASSY` routing (instruction operations)

Or create work orders from the UI. Work order folders under `work-orders/` are local-only (gitignored).

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| Work orders missing on Home | Ensure `npm run dev` is running; API must be on port 5174. List refreshes every 5s on Home. |
| Operations blocked | Complete the previous operation in the routing chain. |
| Cannot complete a step | Fill required inputs; set Profile name and shift. |
| Images not loading | Use paths under the operation’s `.assets` folder; sync library via Git. |
| API errors after code changes | Restart `npm run dev` (API reloads on file changes). |

## License / status

MVP for local use. ERP sync (e.g. Google Sheets) is planned in later milestones; see `dev notes/ORCHE - DEVELOPMENT PLAN.md`.
