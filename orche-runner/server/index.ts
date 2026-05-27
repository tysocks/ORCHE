import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import matter from 'gray-matter'
import { parseOperationMarkdown, parseRoutingTable } from '../src/lib/parseOperation'
import {
  buildTemplateIndex,
  buildWorkOrderSummary,
  createWorkOrder,
  listPartNumbers,
  listRoutingsForPart,
  listWorkOrders,
  loadRoutingTemplate,
  readEvents,
  syncWorkOrderMetadata,
} from './workOrderService'

type TemplateListItem = {
  id: string
  relPath: string
  displayName: string
}

type AppendEventRequest =
  | {
      workOrderId: string
      operationNo?: number
      opId: string
      kind: 'step_completed'
      stepId: string
      user?: string
      at?: string
      inputs?: Record<string, unknown>
    }
  | {
      workOrderId: string
      operationNo?: number
      opId: string
      kind: 'input_changed'
      inputId: string
      value: unknown
      user?: string
      at?: string
    }
  | {
      workOrderId: string
      operationNo?: number
      opId: string
      kind: 'step_uncompleted' | 'operation_completed' | 'operation_uncompleted'
      stepId?: string
      user?: string
      at?: string
    }

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const repoRoot = path.resolve(process.cwd(), '..')
const instructionLibraryRoot = path.join(repoRoot, 'instruction-library')
const workOrdersRoot = path.join(repoRoot, 'work-orders')

function toPosixRelPath(p: string) {
  return p.split(path.sep).join('/')
}

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
}

function mimeFor(filePath: string) {
  return MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

async function listMarkdownFiles(dirAbs: string): Promise<string[]> {
  const out: string[] = []
  const stack = [dirAbs]
  while (stack.length) {
    const current = stack.pop()
    if (!current) continue
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue
        stack.push(path.join(current, e.name))
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
        out.push(path.join(current, e.name))
      }
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

app.get('/api/library/parts', async (_req, res) => {
  try {
    const parts = await listPartNumbers(instructionLibraryRoot)
    res.json({ parts })
  } catch {
    res.status(500).json({ error: 'Failed to list parts' })
  }
})

app.get('/api/library/parts/:partNumber/routings', async (req, res) => {
  const partNumber = String(req.params.partNumber ?? '')
  if (!partNumber || partNumber.includes('..')) {
    res.status(400).json({ error: 'Invalid part number' })
    return
  }
  try {
    const routings = await listRoutingsForPart(instructionLibraryRoot, partNumber)
    res.json({ partNumber, routings })
  } catch {
    res.status(404).json({ error: 'Part not found' })
  }
})

app.get('/api/library/routing', async (req, res) => {
  const partNumber = String(req.query.partNumber ?? '')
  const routing = String(req.query.routing ?? '')
  if (!partNumber || !routing || partNumber.includes('..') || routing.includes('..')) {
    res.status(400).json({ error: 'partNumber and routing required' })
    return
  }
  try {
    const { markdown, rows } = await loadRoutingTemplate(instructionLibraryRoot, partNumber, routing)
    res.json({ partNumber, routing, markdown, operations: rows })
  } catch {
    res.status(404).json({ error: 'Routing template not found' })
  }
})

app.post('/api/work-orders', async (req, res) => {
  const body = req.body as {
    partNumber?: string
    serialNumber?: string
    routing?: string
    workOrderId?: string
  }
  if (!body?.partNumber || !body?.serialNumber || !body?.routing) {
    res.status(400).json({ error: 'partNumber, serialNumber, and routing are required' })
    return
  }
  try {
    const result = await createWorkOrder(instructionLibraryRoot, workOrdersRoot, {
      partNumber: body.partNumber.trim(),
      serialNumber: body.serialNumber.trim(),
      routing: body.routing.trim().toUpperCase(),
      workOrderId: body.workOrderId?.trim(),
    })
    res.status(201).json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create work order'
    res.status(400).json({ error: message })
  }
})

app.get('/api/templates', async (_req, res) => {
  try {
    const mdFiles = await listMarkdownFiles(instructionLibraryRoot)
    const items: TemplateListItem[] = mdFiles.map((abs) => {
      const rel = path.relative(instructionLibraryRoot, abs)
      const base = path.basename(abs, path.extname(abs))
      const opIdMatch = base.match(/(OP-\d{3,})/i)
      return {
        id: (opIdMatch?.[1] ?? base).toUpperCase(),
        relPath: toPosixRelPath(rel),
        displayName: base,
      }
    })
    res.json({ templates: items })
  } catch {
    res.status(500).json({ error: 'Failed to list templates' })
  }
})

app.get('/api/template', async (req, res) => {
  const relPath = String(req.query.path ?? '')
  if (!relPath || relPath.includes('..')) {
    res.status(400).json({ error: 'Invalid path' })
    return
  }
  try {
    const abs = path.join(instructionLibraryRoot, relPath)
    const content = await fs.readFile(abs, 'utf8')
    res.json({ path: relPath, content })
  } catch {
    res.status(404).json({ error: 'Template not found' })
  }
})

app.get('/api/operation', async (req, res) => {
  const relPath = String(req.query.path ?? '')
  if (!relPath || relPath.includes('..')) {
    res.status(400).json({ error: 'Invalid path' })
    return
  }
  try {
    const abs = path.join(instructionLibraryRoot, relPath)
    const content = await fs.readFile(abs, 'utf8')
    const operation = parseOperationMarkdown(content)
    res.json({ path: relPath, operation: { ...operation, templatePath: relPath } })
  } catch {
    res.status(404).json({ error: 'Operation not found' })
  }
})

app.get('/api/library-asset', async (req, res) => {
  const relPath = String(req.query.path ?? '')
  if (!relPath || relPath.includes('..')) {
    res.status(400).json({ error: 'Invalid path' })
    return
  }
  try {
    const root = path.resolve(instructionLibraryRoot)
    const abs = path.resolve(instructionLibraryRoot, relPath)
    const rel = path.relative(root, abs)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    await fs.access(abs)
    res.setHeader('Content-Type', mimeFor(abs))
    createReadStream(abs).pipe(res)
  } catch {
    res.status(404).json({ error: 'Asset not found' })
  }
})

app.get('/api/work-orders', async (_req, res) => {
  try {
    const workOrders = await listWorkOrders(workOrdersRoot)
    res.json({ workOrders })
  } catch {
    res.json({ workOrders: [] })
  }
})

app.get('/api/work-orders/:workOrderId', async (req, res) => {
  const workOrderId = String(req.params.workOrderId ?? '').trim()
  const dir = path.join(workOrdersRoot, workOrderId)
  try {
    await syncWorkOrderMetadata(dir)
    const woPath = path.join(dir, 'work-order.md')
    const routingPath = path.join(dir, 'routing.md')
    const [woText, routingText] = await Promise.all([
      fs.readFile(woPath, 'utf8'),
      fs.readFile(routingPath, 'utf8'),
    ])
    const wo = matter(woText)
    const rows = parseRoutingTable(routingText)
    const templateIndex = await buildTemplateIndex(instructionLibraryRoot)

    res.json({
      id: workOrderId,
      partNumber: wo.data.part_number,
      serialNumber: wo.data.serial_number,
      routing: wo.data.routing,
      status: wo.data.status,
      startDate: wo.data.start_date ?? null,
      endDate: wo.data.end_date ?? null,
      estimatedTimeMinutes: wo.data.estimated_time_minutes ?? null,
      actualTimeMinutes: wo.data.actual_time_minutes ?? null,
      operations: rows.map((row) => ({
        ...row,
        templatePath: templateIndex.get(row.operationId) ?? null,
      })),
    })
  } catch {
    res.status(404).json({ error: 'Work order not found' })
  }
})

app.get('/api/work-orders/:workOrderId/summary', async (req, res) => {
  const workOrderId = String(req.params.workOrderId ?? '').trim()
  const dir = path.join(workOrdersRoot, workOrderId)
  try {
    const summary = await buildWorkOrderSummary(workOrderId, dir, instructionLibraryRoot)
    res.json({ summary })
  } catch {
    res.status(404).json({ error: 'Work order not found' })
  }
})

async function ensureWorkOrderFolder(workOrderId: string) {
  const dir = path.join(workOrdersRoot, workOrderId)
  await fs.mkdir(dir, { recursive: true })
  const eventsPath = path.join(dir, 'process-events.jsonl')
  try {
    await fs.access(eventsPath)
  } catch {
    await fs.writeFile(eventsPath, '')
  }
  return { dir, eventsPath }
}

app.post('/api/work-orders/:workOrderId/events', async (req, res) => {
  const workOrderId = String(req.params.workOrderId ?? '').trim()
  if (!workOrderId) {
    res.status(400).json({ error: 'Missing workOrderId' })
    return
  }

  const body = req.body as AppendEventRequest
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid body' })
    return
  }

  try {
    const { eventsPath, dir } = await ensureWorkOrderFolder(workOrderId)
    const event = {
      ...body,
      workOrderId,
      at: body.at ?? new Date().toISOString(),
    }
    await fs.appendFile(eventsPath, JSON.stringify(event) + '\n', 'utf8')
    await syncWorkOrderMetadata(dir)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to append event' })
  }
})

app.get('/api/work-orders/:workOrderId/events', async (req, res) => {
  const workOrderId = String(req.params.workOrderId ?? '').trim()
  if (!workOrderId) {
    res.status(400).json({ error: 'Missing workOrderId' })
    return
  }

  try {
    const { eventsPath } = await ensureWorkOrderFolder(workOrderId)
    const events = await readEvents(eventsPath)
    res.json({ events })
  } catch {
    res.status(500).json({ error: 'Failed to read events' })
  }
})

const port = 5174
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Orche API listening on http://localhost:${port}`)
})
