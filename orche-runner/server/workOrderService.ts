import path from 'path'
import fs from 'fs/promises'
import matter from 'gray-matter'
import { parseRoutingTable } from '../src/lib/parseOperation'
import type { ProcessEvent } from '../src/lib/types'

export type RoutingRow = {
  operationNo: number
  operationId: string
  operationName: string
  nextOperationNo: number | null
}

export type WorkOrderFrontmatter = {
  part_number: string
  serial_number: string
  routing: string
  status: string
  start_date: string | null
  end_date: string | null
  estimated_time_minutes: number
  actual_time_minutes: number | null
}

export type TemplateRef = {
  operationNo: number
  operationId: string
  operationName: string
  templatePath: string
  estimatedMinutes: number
}

function toPosix(p: string) {
  return p.split(path.sep).join('/')
}

function sortedEvents(events: ProcessEvent[]): ProcessEvent[] {
  return [...events].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
}

function matchesOp(e: ProcessEvent, operationNo: number, opId: string) {
  if (e.operationNo != null) return e.operationNo === operationNo
  return e.opId === opId
}

function deriveOpComplete(events: ProcessEvent[], operationNo: number, opId: string): boolean {
  let complete = false
  for (const e of sortedEvents(events)) {
    if (!matchesOp(e, operationNo, opId)) continue
    if (e.kind === 'operation_completed') complete = true
    if (e.kind === 'operation_uncompleted') complete = false
  }
  return complete
}

export type WorkOrderListItem = {
  id: string
  partNumber: string
  serialNumber: string
  routing: string
  status: string
}

export async function listWorkOrders(workOrdersRoot: string): Promise<WorkOrderListItem[]> {
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(workOrdersRoot, { withFileTypes: true })
  } catch {
    return []
  }

  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  const items = await Promise.all(
    dirs.map(async (id): Promise<WorkOrderListItem | null> => {
      const dir = path.join(workOrdersRoot, id)
      try {
        const meta = await syncWorkOrderMetadata(dir)
        return {
          id,
          partNumber: String(meta.part_number ?? ''),
          serialNumber: String(meta.serial_number ?? ''),
          routing: String(meta.routing ?? ''),
          status: String(meta.status ?? 'Not Started'),
        }
      } catch {
        return null
      }
    }),
  )

  return items
    .filter((item): item is WorkOrderListItem => item != null)
    .sort((a, b) => b.id.localeCompare(a.id))
}

export async function readEvents(eventsPath: string): Promise<ProcessEvent[]> {
  try {
    const text = await fs.readFile(eventsPath, 'utf8')
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as ProcessEvent
        } catch {
          return null
        }
      })
      .filter((e): e is ProcessEvent => e != null)
  } catch {
    return []
  }
}

export async function listPartNumbers(instructionLibraryRoot: string): Promise<string[]> {
  const entries = await fs.readdir(instructionLibraryRoot, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .map((e) => e.name)
    .sort()
}

export async function listRoutingsForPart(
  instructionLibraryRoot: string,
  partNumber: string,
): Promise<string[]> {
  const partDir = path.join(instructionLibraryRoot, partNumber)
  const entries = await fs.readdir(partDir, { withFileTypes: true })
  const routings: string[] = []
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('_')) continue
    const routingMd = path.join(partDir, e.name, 'routing.md')
    try {
      await fs.access(routingMd)
      routings.push(e.name)
    } catch {
      // not a routing folder
    }
  }
  return routings.sort()
}

export async function loadRoutingTemplate(
  instructionLibraryRoot: string,
  partNumber: string,
  routing: string,
): Promise<{ markdown: string; rows: RoutingRow[] }> {
  const routingPath = path.join(instructionLibraryRoot, partNumber, routing, 'routing.md')
  const markdown = await fs.readFile(routingPath, 'utf8')
  return { markdown, rows: parseRoutingTable(markdown) }
}

async function estimatedMinutesForOp(
  instructionLibraryRoot: string,
  partNumber: string,
  routing: string,
  operationId: string,
  templateIndex: Map<string, string>,
): Promise<number> {
  const rel = templateIndex.get(operationId.toUpperCase())
  if (!rel) return 0
  try {
    const content = await fs.readFile(path.join(instructionLibraryRoot, rel), 'utf8')
    const fm = matter(content).data as Record<string, unknown>
    return typeof fm.estimated_minutes === 'number' ? fm.estimated_minutes : 0
  } catch {
    return 0
  }
}

export async function buildTemplateIndex(instructionLibraryRoot: string): Promise<Map<string, string>> {
  const index = new Map<string, string>()
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const abs = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (!e.name.startsWith('.')) await walk(abs)
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.md') && e.name.toLowerCase() !== 'routing.md') {
        const rel = toPosix(path.relative(instructionLibraryRoot, abs))
        const match = e.name.match(/(OP-\d{3,})/i)
        if (match) index.set(match[1].toUpperCase(), rel)
      }
    }
  }
  await walk(instructionLibraryRoot)
  return index
}

export async function generateWorkOrderId(workOrdersRoot: string): Promise<string> {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const prefix = `WO-${y}${m}${d}-`
  let entries: string[] = []
  try {
    entries = await fs.readdir(workOrdersRoot)
  } catch {
    return `${prefix}0001`
  }
  let max = 0
  for (const name of entries) {
    if (!name.startsWith(prefix)) continue
    const seq = Number(name.slice(prefix.length))
    if (!Number.isNaN(seq) && seq > max) max = seq
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export type CreateWorkOrderInput = {
  partNumber: string
  serialNumber: string
  routing: string
  workOrderId?: string
}

export async function createWorkOrder(
  instructionLibraryRoot: string,
  workOrdersRoot: string,
  input: CreateWorkOrderInput,
): Promise<{ id: string; templateRefs: TemplateRef[] }> {
  const { partNumber, serialNumber, routing } = input
  const { markdown: routingMarkdown, rows } = await loadRoutingTemplate(
    instructionLibraryRoot,
    partNumber,
    routing,
  )
  if (rows.length === 0) throw new Error('Routing template has no operations')

  const templateIndex = await buildTemplateIndex(instructionLibraryRoot)
  const templateRefs: TemplateRef[] = []
  let estimatedTotal = 0

  for (const row of rows) {
    const templatePath = templateIndex.get(row.operationId)
    if (!templatePath) {
      throw new Error(`No template found for operation ${row.operationId}`)
    }
    const est = await estimatedMinutesForOp(
      instructionLibraryRoot,
      partNumber,
      routing,
      row.operationId,
      templateIndex,
    )
    estimatedTotal += est
    templateRefs.push({
      operationNo: row.operationNo,
      operationId: row.operationId,
      operationName: row.operationName,
      templatePath,
      estimatedMinutes: est,
    })
  }

  const id =
    input.workOrderId?.trim() ||
    (await generateWorkOrderId(workOrdersRoot))

  const dir = path.join(workOrdersRoot, id)
  try {
    await fs.access(dir)
    throw new Error('Work order already exists')
  } catch (err) {
    if (err instanceof Error && err.message === 'Work order already exists') throw err
  }

  await fs.mkdir(dir, { recursive: true })
  await fs.mkdir(path.join(dir, 'attachments'), { recursive: true })

  const frontmatter: WorkOrderFrontmatter = {
    part_number: partNumber,
    serial_number: serialNumber,
    routing,
    status: 'Not Started',
    start_date: null,
    end_date: null,
    estimated_time_minutes: estimatedTotal,
    actual_time_minutes: null,
  }

  const workOrderMd = matter.stringify(
    `\n# Work Order ${id}\n\nCreated ${new Date().toISOString()}.\n`,
    frontmatter,
  )

  await fs.writeFile(path.join(dir, 'work-order.md'), workOrderMd, 'utf8')
  await fs.writeFile(path.join(dir, 'routing.md'), routingMarkdown, 'utf8')
  await fs.writeFile(path.join(dir, 'process-events.jsonl'), '', 'utf8')
  await fs.writeFile(
    path.join(dir, 'template-refs.json'),
    JSON.stringify({ createdAt: new Date().toISOString(), partNumber, routing, operations: templateRefs }, null, 2),
    'utf8',
  )

  return { id, templateRefs }
}

export function computeMetadataFromEvents(
  events: ProcessEvent[],
  routingRows: RoutingRow[],
  current: WorkOrderFrontmatter,
): WorkOrderFrontmatter {
  const woEvents = sortedEvents(events)
  const hasActivity = woEvents.some(
    (e) =>
      e.kind === 'input_changed' ||
      e.kind === 'step_completed' ||
      e.kind === 'step_uncompleted' ||
      e.kind === 'operation_completed' ||
      e.kind === 'operation_uncompleted',
  )

  const allComplete =
    routingRows.length > 0 &&
    routingRows.every((row) => deriveOpComplete(woEvents, row.operationNo, row.operationId))

  let status = current.status
  if (allComplete) status = 'Completed'
  else if (hasActivity) status = 'Active'
  else status = 'Not Started'

  const timestamps = woEvents.map((e) => e.at).filter(Boolean) as string[]
  const start_date = timestamps.length > 0 ? timestamps[0] : null

  let end_date: string | null = current.end_date ?? null
  if (allComplete) {
    const completedAts = woEvents
      .filter((e) => e.kind === 'operation_completed' && e.at)
      .map((e) => e.at as string)
    end_date = completedAts.length > 0 ? completedAts[completedAts.length - 1] : timestamps[timestamps.length - 1]
  } else {
    end_date = null
  }

  let actual_time_minutes: number | null = null
  if (start_date && end_date) {
    const ms = new Date(end_date).getTime() - new Date(start_date).getTime()
    actual_time_minutes = Math.max(0, Math.round(ms / 60_000))
  } else if (start_date && status === 'Active') {
    const ms = Date.now() - new Date(start_date).getTime()
    actual_time_minutes = Math.max(0, Math.round(ms / 60_000))
  }

  return {
    ...current,
    status,
    start_date,
    end_date,
    actual_time_minutes,
  }
}

export async function syncWorkOrderMetadata(workOrderDir: string): Promise<WorkOrderFrontmatter> {
  const woPath = path.join(workOrderDir, 'work-order.md')
  const routingPath = path.join(workOrderDir, 'routing.md')
  const eventsPath = path.join(workOrderDir, 'process-events.jsonl')

  const [woText, routingText, events] = await Promise.all([
    fs.readFile(woPath, 'utf8'),
    fs.readFile(routingPath, 'utf8'),
    readEvents(eventsPath),
  ])

  const woFile = matter(woText)
  const current = woFile.data as WorkOrderFrontmatter
  const routingRows = parseRoutingTable(routingText)
  const updated = computeMetadataFromEvents(events, routingRows, current)

  const nextMd = matter.stringify(woFile.content, updated)
  await fs.writeFile(woPath, nextMd, 'utf8')
  return updated
}

export type SummaryOperation = {
  operationNo: number
  operationId: string
  operationName: string
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked'
  completedAt: string | null
  capturedInputs: Record<string, unknown>
}

export type WorkOrderSummary = {
  id: string
  partNumber: string
  serialNumber: string
  routing: string
  status: string
  startDate: string | null
  endDate: string | null
  estimatedTimeMinutes: number
  actualTimeMinutes: number | null
  operations: SummaryOperation[]
  allCapturedInputs: Array<{
    operationNo: number
    operationId: string
    operationName: string
    inputId: string
    value: unknown
  }>
}

export async function buildWorkOrderSummary(
  workOrderId: string,
  workOrderDir: string,
  instructionLibraryRoot: string,
): Promise<WorkOrderSummary> {
  const meta = await syncWorkOrderMetadata(workOrderDir)
  const routingText = await fs.readFile(path.join(workOrderDir, 'routing.md'), 'utf8')
  const routingRows = parseRoutingTable(routingText)
  const events = await readEvents(path.join(workOrderDir, 'process-events.jsonl'))

  const completedOpNos = new Set<number>()
  for (const row of routingRows) {
    if (deriveOpComplete(events, row.operationNo, row.operationId)) {
      completedOpNos.add(row.operationNo)
    }
  }
  const blocked = new Set<number>()
  for (const row of routingRows) {
    if (row.nextOperationNo != null && !completedOpNos.has(row.operationNo)) {
      blocked.add(row.nextOperationNo)
    }
  }

  const operations: SummaryOperation[] = routingRows.map((row) => {
    let status: SummaryOperation['status'] = 'not_started'
    if (deriveOpComplete(events, row.operationNo, row.operationId)) status = 'completed'
    else if (blocked.has(row.operationNo)) status = 'blocked'
    else if (
      events.some(
        (e) =>
          matchesOp(e, row.operationNo, row.operationId) &&
          (e.kind === 'input_changed' || e.kind === 'step_completed'),
      )
    )
      status = 'in_progress'

    const capturedInputs: Record<string, unknown> = {}
    for (const e of sortedEvents(events)) {
      if (!matchesOp(e, row.operationNo, row.operationId)) continue
      if (e.kind === 'input_changed' && e.inputId) capturedInputs[e.inputId] = e.value
      if (e.kind === 'step_completed' && e.inputs) Object.assign(capturedInputs, e.inputs)
    }

    let completedAt: string | null = null
    for (const e of sortedEvents(events)) {
      if (!matchesOp(e, row.operationNo, row.operationId)) continue
      if (e.kind === 'operation_completed' && e.at) completedAt = e.at
      if (e.kind === 'operation_uncompleted') completedAt = null
    }

    return {
      operationNo: row.operationNo,
      operationId: row.operationId,
      operationName: row.operationName,
      status,
      completedAt,
      capturedInputs,
    }
  })

  const allCapturedInputs: WorkOrderSummary['allCapturedInputs'] = []
  for (const op of operations) {
    for (const [inputId, value] of Object.entries(op.capturedInputs)) {
      allCapturedInputs.push({
        operationNo: op.operationNo,
        operationId: op.operationId,
        operationName: op.operationName,
        inputId,
        value,
      })
    }
  }

  return {
    id: workOrderId,
    partNumber: meta.part_number,
    serialNumber: meta.serial_number,
    routing: meta.routing,
    status: meta.status,
    startDate: meta.start_date,
    endDate: meta.end_date,
    estimatedTimeMinutes: meta.estimated_time_minutes,
    actualTimeMinutes: meta.actual_time_minutes,
    operations,
    allCapturedInputs,
  }
}
