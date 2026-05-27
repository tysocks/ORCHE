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

### 3. Work order — operations list

Each row is one operation from the routing table:

- Operation number, name, and `OP-######` ID
- **Status icon** — not started, in progress, complete, or blocked
- **Summary** (clipboard icon) — times, captured inputs, operation status

Operations are **blocked** until the previous operation in the routing chain is completed.

Click an operation to run it.

### 4. Operation runner — steps

**Top bar**

- **Work order pill** (left) — return to the operations list.
- Operation title and progress (`completed / total` steps).
- **Complete operation** (check) — enabled only when **all steps** are complete; does not auto-complete when the last step is finished.
- **Tools** (wrench) — required tooling from operation frontmatter (`required_tools`).
- **Menu** (⋮) — view all step notes for this operation.

**Each step**

- Instruction text (Markdown, callouts, images).
- **Inputs** — text, number, textarea, select, or Yes/No (`checkbox` type).
- **Toolbar** (sticky while scrolling the step):
  - **Complete** — marks step done; shows operator name when complete.
  - **Note** — open to view or edit a step note (no preview until the note button is used).
  - **Next** — scroll to the next incomplete step.

Steps cannot be completed until required inputs are filled and profile is set.

### 5. Work order summary

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
default_title: Demo Assembly
estimated_minutes: 15
schema_version: 1
required_tools:
  - Torque wrench (calibrated)
  - Digital caliper
---
```

Content before the first `## Step` heading is parsed but **not shown** in the runner (operation title/description are taken from routing + frontmatter).

### Steps

Use level-2 headings:

```markdown
## Step 1 — Identify unit

Instruction text here.
```

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
| `checkbox` | Yes / No toggle |

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

- Part: `E02-XXXXX`
- Routing: `ASSY`
- Operations: `OP-000001` (Demo Assembly), `OP-000002` (Demo Test)

Create a work order from the UI to exercise the full flow. Work order folders under `work-orders/` are local-only (gitignored).

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
