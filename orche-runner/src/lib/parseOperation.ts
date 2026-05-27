import matter from 'gray-matter'
import type { OperationStep, OrcheInput, ParsedOperation } from './types'

const ORCHE_INPUT_RE = /```orche-input\s*\n([\s\S]*?)```/g

export function safeJsonParse<T>(raw: string): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as T }
  } catch {
    return { ok: false }
  }
}

function slugifyStepId(title: string, index: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return slug ? `step_${index}_${slug}` : `step_${index}`
}

function extractInputs(markdown: string): OrcheInput[] {
  const inputs: OrcheInput[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(ORCHE_INPUT_RE.source, 'g')
  while ((match = re.exec(markdown)) !== null) {
    const parsed = safeJsonParse<OrcheInput>(match[1].trim())
    if (parsed.ok) inputs.push(parsed.value)
  }
  return inputs
}

function stripOrcheInputs(markdown: string): string {
  return markdown.replace(ORCHE_INPUT_RE, '').trim()
}

function parseSteps(markdown: string): { intro: string; steps: OperationStep[] } {
  const parts = markdown.split(/^##\s+/m)
  const intro = (parts[0] ?? '').trim()
  const steps: OperationStep[] = []

  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i]
    const newline = chunk.indexOf('\n')
    const title = (newline === -1 ? chunk : chunk.slice(0, newline)).trim()
    const body = (newline === -1 ? '' : chunk.slice(newline + 1)).trim()
    const index = i
    steps.push({
      id: slugifyStepId(title, index),
      title,
      bodyMarkdown: stripOrcheInputs(body),
      inputs: extractInputs(body),
    })
  }

  return { intro, steps }
}

export function parseOperationMarkdown(content: string): ParsedOperation {
  const { data, content: markdown } = matter(content)
  const fm = data as Record<string, unknown>
  const { intro, steps } = parseSteps(markdown)

  const toolsRaw = fm.required_tools
  const requiredTools = Array.isArray(toolsRaw)
    ? toolsRaw.map((t) => String(t).trim()).filter(Boolean)
    : undefined

  return {
    opId: String(fm.op_id ?? 'OP-UNKNOWN'),
    title: String(fm.default_title ?? 'Operation'),
    estimatedMinutes:
      typeof fm.estimated_minutes === 'number' ? fm.estimated_minutes : undefined,
    introMarkdown: intro,
    requiredTools,
    steps,
  }
}

export function parseRoutingTable(markdown: string): import('./types').RoutingRow[] {
  const lines = markdown.split('\n')
  const rows: import('./types').RoutingRow[] = []

  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue
    if (line.includes('---')) continue
    if (/operation\s+no/i.test(line)) continue

    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''))

    if (cells.length < 3) continue

    const operationNo = Number(cells[0])
    if (Number.isNaN(operationNo)) continue

    const nextRaw = cells[3]?.trim()
    rows.push({
      operationNo,
      operationId: cells[1].toUpperCase(),
      operationName: cells[2] || cells[1],
      nextOperationNo: nextRaw ? Number(nextRaw) : null,
    })
  }

  return rows
}
