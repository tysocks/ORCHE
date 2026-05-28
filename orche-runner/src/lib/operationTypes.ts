export type OperationType = 'instruction' | 'checklist'

export const OPERATION_TYPES: OperationType[] = ['instruction', 'checklist']

export function parseOperationType(raw: unknown): OperationType {
  const t = String(raw ?? 'instruction')
    .trim()
    .toLowerCase()
  return t === 'checklist' ? 'checklist' : 'instruction'
}

export function operationTypeLabel(type: OperationType): string {
  return type === 'checklist' ? 'Checklist' : 'Instruction'
}

/** First plain line of step body for condensed checklist subtitle. */
export function checklistStepHint(bodyMarkdown: string): string {
  const line =
    bodyMarkdown
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith('```')) ?? ''
  return line
    .replace(/^[-*>\s]+/, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .slice(0, 160)
}
