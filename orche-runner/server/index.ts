import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs/promises'

type TemplateListItem = {
  id: string
  relPath: string
  displayName: string
}

type AppendEventRequest =
  | {
      workOrderId: string
      opId: string
      kind: 'step_completed'
      stepId: string
      user?: string
      at?: string
      inputs?: Record<string, unknown>
    }
  | {
      workOrderId: string
      opId: string
      kind: 'input_changed'
      inputId: string
      value: unknown
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

async function listMarkdownFiles(dirAbs: string): Promise<string[]> {
  const out: string[] = []
  const stack = [dirAbs]
  while (stack.length) {
    const current = stack.pop()
    if (!current) continue
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const e of entries) {
      // skip node_modules and hidden folders in case someone drops a vault there
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
  } catch (e) {
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
    const { eventsPath } = await ensureWorkOrderFolder(workOrderId)
    const event = {
      ...body,
      workOrderId,
      at: body.at ?? new Date().toISOString(),
    }
    await fs.appendFile(eventsPath, JSON.stringify(event) + '\n', 'utf8')
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
    const text = await fs.readFile(eventsPath, 'utf8')
    const events = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as unknown
        } catch {
          return null
        }
      })
      .filter(Boolean)
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

