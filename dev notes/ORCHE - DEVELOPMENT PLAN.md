Work Instruction Interface
# Scope
Orche is a work instruction interface meant to provide an interface between the operator/technician and the work instructions. The work instructions will be written as a markdown, Orche will then take the md, and display is in a UI. The main difference between a md viewer and Orche is that Orche will allow for variables to be inputted and data to be recorded.

# Implementation Plan (Phased, MVP-first)
Goal: deliver a lightweight “work instruction runner” that renders Obsidian-authored Markdown templates, captures structured inputs + timestamps + user, enforces routing dependencies, and produces queryable outputs (status + BOM traceability) without adding heavy process.

## Guiding Principles (avoid encumbering process)
- Author in Obsidian, run in Orche. Do not force authors/operators to learn Git beyond “sync”.
- Markdown is for human-readable instructions; captured runtime data is structured (JSON) for sync/reporting.
- Prefer append-only event logs (conflict tolerant) and derived state (prevents drift).
- Avoid copying templates into each order by default; reference templates by stable IDs + version.

## Phase 0 — Contracts (stable backbone)
### Identifiers
- Work order ID: `WO-YYYYMMDD-####` (or ERP-provided).
- Operation template ID: immutable `OP-######` (not derived from filenames).
- Step ID: stable within an operation template (e.g. `s1`, `s2`, `s3` or UUIDs).

### Template format (Obsidian-friendly)
- Operation templates are Markdown with YAML frontmatter:
  - `op_id`, `default_title`, `estimated_minutes`, `schema_version`
  - optional: `inputs` / UI metadata as needed by the renderer

### Runtime data format (source of truth)
- Work order runtime state is stored as JSON (not Markdown):
  - `process-events.jsonl` (append-only, one JSON object per line)
  - derived “current state” can be materialized on demand or cached (`process-state.json`)

## Phase 1 — Instruction Library (GitHub + Obsidian)
### Recommended storage
- Store instruction templates + embedded assets in Git (GitHub). Use Git LFS only if assets get large.
- Authors open the repo as an Obsidian vault locally and “sync” via git (plugin/desktop app).

### Folder structure
- `instruction-library/`
  - `<part-number>/`
    - `<routing-code>/`
      - `OP-001234 - Assembly 1.md`
      - `OP-001234 - Assembly 1.assets/` (images/files referenced by the markdown)
  - `_shared-assets/` (optional)

## Phase 2 — Work Orders (thin instances)
### Work order folder structure (instance)
- `work-orders/<WO-ID>/`
  - `work-order.md` (human summary + metadata frontmatter)
  - `routing.md` (routing snapshot for this order)
  - `process-events.jsonl` (append-only runtime events)
  - `attachments/` (operator-added photos/files, optional)

### Template reference model (default)
- Work orders reference templates by `op_id` + template version (git commit hash at release time).
- If compliance requires “freeze”: store a rendered export at release (HTML/PDF), not copies of every template file.

## Phase 3 — Orche Runner (first valuable vertical slice)
### MVP UI screens
- Work queue: list open work orders and statuses.
- Work order view: operations list + dependency gating.
- Operation runner: render markdown + interactive inputs; “Complete step” appends an event.

### Dependency gating
- Parse routing table (`routing.md`) into a graph.
- Compute which operations are “available” based on completed operations.

## Phase 4 — Sync / “ERP visibility” (start simple)
### MVP approach (fast)
- Use Google Sheets as a status mirror (not the event store):
  - Orche writes rollups on key transitions: order start, operation complete, order complete.

### Preferred durable approach (later)
- Small backend + DB for work orders and events; optionally export status to Sheets for ERP visibility.

## Phase 5 — BOM traceability
- Track BOM allocations and consumption as structured records keyed by `serial_number`.
- Allow steps to capture lot/serial scans as inputs and write events that link to BOM items.

## Milestones (what “done” looks like)
- M1: Can load one operation template MD, render it, capture step completion and inputs to `process-events.jsonl`.
- M2: Can create a work order from a routing (references templates) and run through operations with dependency gating.
- M3: Can produce a one-page work order summary (status, start/end, actual time, key captured fields).
- M4: Optional: Sheets status mirror working end-to-end.

# Instruction Structure
The structure of the instructions are as follows. 
- routing
	- operation 1
		- step 1
		- step 2
		- ...
	- operation 2
	- operation 3
	- ...
This needs to be represented by a collection of files and folders to organize the files and store data regarding the order. Each order will consist of a routing. 
- parent folder (work order)
	- work order details/data (md)
		- part number (number)
		- serial number (number)
		- routing (code)
		- status (option)
		- start date (date)
		- end date (date)
		- estimated time (time)
		- actual time (time)
	- routing details (md)
		- routing (code)
		- operation (list)
		- dependencies (list)
	- process data (md)
	- operations (folder)
		- operation 1 (md)
		- operation 2 (md)
		- operation 3 (md)
		- ...
	- src (folder)
		- image 1
		- image 2
		- file 1
		- ...
# Additional Infrastructure 
This is currently in WIP, looking for suggestions on how to fill this. This tool is meant for a tool for a group of people spread out remotely across the planet. The tool needs to be usable for all members, communicate with a ERP system, and maintain aligned between instances.

## Work Instructions
Each work instruction before being inserted into a work order will be the same instruction without the operation data included. This includes things like checkboxes, text inputs, number inputs, file inputs, etc. These blank md files will be referenced when creating the work order and copied into the working operations folder of the work order but before that happens, where should these md files be stored? This is a similar problem for images that I want to embed in the work instructions. 

I want to use obsidian for viewing and creating the work instructions, which embeds files that are in the local folder on your machine, this would me that for someone to view the photo that photo would also need to be downloaded locally. This will be the src folder. 

The main question I have is how should this be stored and accessed by members. 

I want the folder structure for these instructions to be as follows. 
- part number
	- routing 1
		- operation no 1 -operation id 1
		- operation  no 2 - operation id 2
		- ...
	- routing 2
	- ...
## Creating Work Instructions 
I want the work instructions to be created in obsidian as md files. How should this process be structured? How will embedded images be put in the correct location, etc.

## Syncing Orders with ERP
I want to create an ERP solution as well. The goal is that the status of the order can be seen by the ERP. Can this be done in Google sheets? Or can this data be summarized in a shared location?

## Bill of Materials
I want to have a way to track the bill of materials for the serial numbers on each order. This ideally should also sync with something on the google drive or a shared drive/location. 

This are problems that are still looking for solutions. 

# Parent Folder
This is a folder than is created when the work order is created. When the work order is created the work order details file, routing details file, and operation folder are populated. All of the operations in the operation folder will be pulled from a template.

The data in the work order details file, specifically the start date, end date, and actual time start as blank. This data will be updated as specific events are completed in the work order. 

# Work Order Details
This is a markdown file that outlines the details and metadata for the order. 
- part number - Input when created, will be in the format of E02-XXXXX or other letter codes. This is used to specify what part/system the work is being performed on.
- serial number - Input when created, should be a unique indicator of the item. Sequential number that is separately incremented for each part number. Requires input or being read from a specific tracker.
- routing - code the designates the set of operations that make up the order. The routing must match the built routings for that part number. For example there could be an assembly routing denoted as ASSY, or testing order denoted as TEST or TEST001. Or an order for rework as REWK. Maximum length of 10 char, should be Upper case letters with optional number suffix. 
- status - Indicates the status of the order. 
	- Unreleased - Created but missing some information
	- Not Started - Work Order ready for work but no operations have been started (Start Date Empty)
	- Active - Work is started
	- Rejected - Order cancelled, manual process
	- Completed - All operations completed.
- Start Date - Date and time of the first operation started, updated when status transitions. 
- End Date - Date and time of the last operation completed, updated when status transitions. 
- estimated time - Sum of operation estimated time
- actual time - sum of operation actual time, updated when operations are completed

The work order details are checked and updated every time an operation is completed. 

# Routing Details
This is a markdown file that shows which operations make up the order, and in which order they need to be completed. The format should be something like this.

| Operation No | Operation ID | Operation Name (default if blank) | Next Operation No |
| ------------ | ------------ | --------------------------------- | ----------------- |
| 1            | XXX12        | Assembly 1                        | 3                 |
| 2            | XXXXX        | Assembly 2                        | 3                 |
| 3            | XXXXX        | Test System                       |                   |
|              |              |                                   |                   |
Operation number is the order of the operations in the viewer/work order, and represent the preferred order of completion. Operation ID represents the unique numeric ID for each work instruction/operation md. Name is default to the operation name corresponding to the operation ID but can be overwritten if wanted, and next operation No represents the operation no that is blocked by the current operations. In the example above, operation 1 and 2 need to be completed before operation 3 can start. Operation 3 does not have a next operation no and therefore is not blocking anything. 

The routing details is a md file that is copied from the routing folder when the the work order is created, it serves as the source of truth for the operations in the order and dependencies. 

If a new entry is added. example operation no 1.4, op id XXXXX. Then this will be added on the view.

# Process Data
The process data file stores all of the data regarding the steps in the operation. This includes.
- Time of completion for each step in the operation
- Who completed each step (user)
- Optional notes appended to each step
- Process inputs of step
	- check boxes
	- numerical inputs
	- text inputs
	- dropdown options
	- etc
This data is updated every time a user clicks the complete button on a step. Each of these inputs has a unique id that can be queried to summarize process data. 

# Operations (folder)
folder that holds all of the operation md. The operation md files should have the following naming convention. operation no-operation id-operation title.

# SRC
The source folder. Which holds the images and files to be embedded in the instructions, similar to how images are embedded in obsidian.

