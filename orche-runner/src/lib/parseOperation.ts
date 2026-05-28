import matter from 'gray-matter'
import { parseChecklistMarkdown } from './parseChecklist'
import { parseOperationType } from './operationTypes'
import { parseRequiredTools } from './tools'
import type { OperationStep, OrcheInput, ParsedOperation } from './types'

const ORCHE_INPUT_RE = /```orche-input\s*\n([\s\S]*?)```/g
const REQUIRED_TOOLS_BLOCK_RE = /(?:^|\n)(```|''')required_tools\s*\n([\s\S]*?)\n\1\s*(?=\n|$)/gi

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

function parseRequiredToolsBlock(content: string): Array<string | Record<string, unknown>> {
  const out: Array<string | Record<string, unknown>> = []
  const lines = content
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0)

  let i = 0
  while (i < lines.length) {
    const raw = lines[i].trim()
    if (!raw.startsWith('- ')) {
      i++
      continue
    }

    const first = raw.slice(2).trim()
    if (!first) {
      i++
      continue
    }

    const inlineKeyValue = first.match(/^([a-zA-Z0-9_]+)\s*:\s*(.+)$/)
    if (inlineKeyValue) {
      const obj: Record<string, unknown> = { [inlineKeyValue[1]]: inlineKeyValue[2].trim() }
      i++
      while (i < lines.length) {
        const next = lines[i]
        if (next.trim().startsWith('- ')) break
        const kv = next.trim().match(/^([a-zA-Z0-9_]+)\s*:\s*(.+)$/)
        if (kv) obj[kv[1]] = kv[2].trim()
        i++
      }
      out.push(obj)
      continue
    }

    out.push(first)
    i++
  }

  return out
}

function extractRequiredToolsSection(markdown: string): {
  cleanedMarkdown: string
  requiredTools?: Array<string | Record<string, unknown>>
} {
  let cleaned = markdown
  const collected: Array<string | Record<string, unknown>> = []
  let match: RegExpExecArray | null
  const re = new RegExp(REQUIRED_TOOLS_BLOCK_RE.source, 'gi')

  while ((match = re.exec(markdown)) !== null) {
    collected.push(...parseRequiredToolsBlock(match[2] ?? ''))
  }

  cleaned = cleaned.replace(REQUIRED_TOOLS_BLOCK_RE, '\n').trim()
  return {
    cleanedMarkdown: cleaned,
    requiredTools: collected.length > 0 ? collected : undefined,
  }
}

export function parseOperationMarkdown(content: string): ParsedOperation {
  const { data, content: markdown } = matter(content)
  const fm = data as Record<string, unknown>
  const operationType = parseOperationType(fm.operation_type)
  const { cleanedMarkdown, requiredTools } = extractRequiredToolsSection(markdown)
  const requiredToolEntries = parseRequiredTools(requiredTools)

  if (operationType === 'checklist') {
    const { intro, sections, steps } = parseChecklistMarkdown(cleanedMarkdown)
    return {
      opId: String(fm.op_id ?? 'OP-UNKNOWN'),
      title: String(fm.default_title ?? 'Operation'),
      operationType,
      estimatedMinutes:
        typeof fm.estimated_minutes === 'number' ? fm.estimated_minutes : undefined,
      introMarkdown: intro,
      requiredTools,
      requiredToolEntries,
      steps,
      checklistSections: sections,
    }
  }

  const { intro, steps } = parseSteps(cleanedMarkdown)

  return {
    opId: String(fm.op_id ?? 'OP-UNKNOWN'),
    title: String(fm.default_title ?? 'Operation'),
    operationType,
    estimatedMinutes:
      typeof fm.estimated_minutes === 'number' ? fm.estimated_minutes : undefined,
    introMarkdown: intro,
    requiredTools,
    requiredToolEntries,
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

  return rows.sort((a, b) => a.operationNo - b.operationNo)
}
