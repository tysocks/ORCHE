import type { ChecklistItem, ChecklistSection, OperationStep, OrcheInput } from './types'
import { safeJsonParse } from './parseOperation'

const ORCHE_INPUT_RE = /```orche-input\s*\n([\s\S]*?)```/g
const CHECKLIST_HEADER_RE = /^(\d+)\.(\d+)\s+(.+)$/

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

function slugifyChecklistId(major: number, minor: number, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return slug ? `check_${major}_${minor}_${slug}` : `check_${major}_${minor}`
}

function cleanChecklistTitle(raw: string): string {
  return raw
    .replace(/^step\s+\d+\s*[—–-]\s*/i, '')
    .replace(/\s*\(y\/n\)\s*$/i, '')
    .trim()
}

export function parseChecklistMarkdown(markdown: string): {
  intro: string
  sections: ChecklistSection[]
  steps: OperationStep[]
} {
  const parts = markdown.split(/^##\s+/m)
  const intro = (parts[0] ?? '').trim()
  const sections: ChecklistSection[] = []
  let currentSection: ChecklistSection | null = null

  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i]
    const newline = chunk.indexOf('\n')
    const headerLine = (newline === -1 ? chunk : chunk.slice(0, newline)).trim()
    const body = (newline === -1 ? '' : chunk.slice(newline + 1)).trim()

    const m = headerLine.match(CHECKLIST_HEADER_RE)
    if (!m) continue

    const major = Number(m[1])
    const minor = Number(m[2])
    const title = cleanChecklistTitle(m[3])

    if (minor === 0) {
      currentSection = {
        id: slugifyChecklistId(major, 0, title),
        number: `${major}.0`,
        major,
        title,
        note: stripOrcheInputs(body) || undefined,
        items: [],
      }
      sections.push(currentSection)
      continue
    }

    if (!currentSection || currentSection.major !== major) {
      const fallbackTitle: string = `Section ${major}`
      currentSection = {
        id: slugifyChecklistId(major, 0, fallbackTitle),
        number: `${major}.0`,
        major,
        title: fallbackTitle,
        items: [],
      }
      sections.push(currentSection)
    }

    const inputs = extractInputs(body)
    const item: ChecklistItem = {
      id: slugifyChecklistId(major, minor, title),
      number: `${major}.${minor}`,
      major,
      minor,
      title,
      inputs,
    }
    currentSection.items.push(item)
  }

  const steps: OperationStep[] = sections.map((section) => ({
    id: section.id,
    title: `${section.number} ${section.title}`,
    bodyMarkdown: section.note ?? '',
    inputs: section.items.flatMap((item) => item.inputs),
  }))

  return { intro, sections, steps }
}
