import { checkboxChoiceLabels } from './checkboxInput'
import { matchesOperation, sortedByTime } from './events'
import type { OrcheInput, ParsedOperation, ProcessEvent } from './types'

export type ActionLogEntry = {
  id: string
  at: string
  kind: string
  title: string
  detail: string
  operator?: string
}

function operatorLabel(e: ProcessEvent): string | undefined {
  const name = e.completedBy ?? e.operatorName
  if (!name) return undefined
  return name
}

function buildStepTitleMap(operation: ParsedOperation): Map<string, string> {
  const map = new Map<string, string>()
  for (const step of operation.steps) {
    map.set(step.id, step.title)
  }
  for (const section of operation.checklistSections ?? []) {
    map.set(section.id, `${section.number} ${section.title}`)
    for (const item of section.items) {
      map.set(item.id, `${item.number} ${item.title}`)
    }
  }
  return map
}

function buildInputDefMap(operation: ParsedOperation): Map<string, OrcheInput> {
  const map = new Map<string, OrcheInput>()
  const addInputs = (inputs: OrcheInput[]) => {
    for (const def of inputs) map.set(def.id, def)
  }
  for (const step of operation.steps) addInputs(step.inputs)
  for (const section of operation.checklistSections ?? []) {
    for (const item of section.items) addInputs(item.inputs)
  }
  return map
}

function formatValueForLog(value: unknown, def?: OrcheInput): string {
  if (def?.type === 'checkbox') {
    const { trueLabel, falseLabel } = checkboxChoiceLabels(def, 'long')
    if (value === true) return trueLabel
    if (value === false) return falseLabel
  }
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (value == null || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function inputFieldLabel(def: OrcheInput | undefined, inputId: string): string {
  if (!def) return inputId
  if (def.label?.trim()) return def.label
  if (def.type === 'checkbox') return 'Response'
  return inputId
}

function formatInputSnapshot(
  inputs: Record<string, unknown>,
  inputDefs: Map<string, OrcheInput>,
): string {
  const parts = Object.entries(inputs).map(([id, value]) => {
    const def = inputDefs.get(id)
    const label = inputFieldLabel(def, id)
    return `${label}: ${formatValueForLog(value, def)}`
  })
  return parts.length > 0 ? parts.join('; ') : '—'
}

const LOGGED_KINDS = new Set([
  'input_changed',
  'step_completed',
  'step_uncompleted',
  'step_note',
  'operation_completed',
  'operation_uncompleted',
])

export function buildActionLogEntries(
  events: ProcessEvent[],
  operationNo: number,
  opId: string,
  operation: ParsedOperation,
): ActionLogEntry[] {
  const stepTitles = buildStepTitleMap(operation)
  const inputDefs = buildInputDefMap(operation)
  const isChecklist = operation.operationType === 'checklist'
  const priorValues = new Map<string, unknown>()
  const entries: ActionLogEntry[] = []

  const opEvents = sortedByTime(events).filter(
    (e) => matchesOperation(e, operationNo, opId) && e.kind && LOGGED_KINDS.has(e.kind),
  )

  opEvents.forEach((e, index) => {
    const at = e.at ?? ''
    const id = `${at}-${index}-${e.kind}`
    const operator = operatorLabel(e)
    const stepTitle = e.stepId ? (stepTitles.get(e.stepId) ?? e.stepId) : undefined

    switch (e.kind) {
      case 'input_changed': {
        if (!e.inputId) break
        const def = inputDefs.get(e.inputId)
        const field = inputFieldLabel(def, e.inputId)
        const next = formatValueForLog(e.value, def)
        const hadPrior = priorValues.has(e.inputId)
        const prev = hadPrior ? formatValueForLog(priorValues.get(e.inputId), def) : null
        priorValues.set(e.inputId, e.value)
        entries.push({
          id,
          at,
          kind: e.kind,
          title: 'Input updated',
          detail: hadPrior ? `${field}: ${prev} → ${next}` : `${field}: ${next}`,
          operator,
        })
        break
      }
      case 'step_completed': {
        if (e.inputs) {
          for (const [inputId, value] of Object.entries(e.inputs)) {
            priorValues.set(inputId, value)
          }
        }
        const snapshot =
          e.inputs && Object.keys(e.inputs).length > 0
            ? formatInputSnapshot(e.inputs, inputDefs)
            : null
        entries.push({
          id,
          at,
          kind: e.kind,
          title: isChecklist ? 'Section completed' : 'Step completed',
          detail: snapshot
            ? `${stepTitle ?? 'Step'} — ${snapshot}`
            : (stepTitle ?? 'Step'),
          operator,
        })
        break
      }
      case 'step_uncompleted':
        entries.push({
          id,
          at,
          kind: e.kind,
          title: isChecklist ? 'Section reopened' : 'Step reopened',
          detail: stepTitle ?? 'Step',
          operator,
        })
        break
      case 'step_note': {
        const note = String(e.note ?? '').trim()
        entries.push({
          id,
          at,
          kind: e.kind,
          title: 'Note saved',
          detail: note ? `${stepTitle ?? 'Step'} — ${note}` : (stepTitle ?? 'Step'),
          operator,
        })
        break
      }
      case 'operation_completed':
        entries.push({
          id,
          at,
          kind: e.kind,
          title: 'Operation completed',
          detail: operation.title,
          operator,
        })
        break
      case 'operation_uncompleted':
        entries.push({
          id,
          at,
          kind: e.kind,
          title: 'Operation reopened',
          detail: operation.title,
          operator,
        })
        break
      default:
        break
    }
  })

  return entries.reverse()
}

const WO_LOGGED_KINDS = new Set([
  ...LOGGED_KINDS,
  'work_order_completed',
  'work_order_uncompleted',
  'operation_added',
  'operation_removed',
])

export function filterEventsForOperation(
  events: ProcessEvent[],
  operationNo: number,
  opId: string,
): ProcessEvent[] {
  return events.filter(
    (e) =>
      e.kind &&
      WO_LOGGED_KINDS.has(e.kind) &&
      matchesOperation(e, operationNo, opId),
  )
}

function operationPrefix(
  e: ProcessEvent,
  operationLabels: Map<string, string>,
): string {
  if (e.operationNo == null || !e.opId) return ''
  const label = operationLabels.get(`${e.operationNo}:${e.opId}`)
  return label ? `${label} — ` : `Op ${e.operationNo} — `
}

function formatWorkOrderValue(value: unknown): string {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (value == null || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function buildWorkOrderActionLogEntries(
  events: ProcessEvent[],
  operationLabels: Map<string, string>,
): ActionLogEntry[] {
  const entries: ActionLogEntry[] = []
  const priorValues = new Map<string, unknown>()

  sortedByTime(events)
    .filter((e) => e.kind && WO_LOGGED_KINDS.has(e.kind))
    .forEach((e, index) => {
      const at = e.at ?? ''
      const id = `${at}-wo-${index}-${e.kind}`
      const operator = operatorLabel(e)
      const prefix = operationPrefix(e, operationLabels)

      switch (e.kind) {
        case 'work_order_completed':
          entries.push({
            id,
            at,
            kind: e.kind,
            title: 'Work order completed',
            detail: 'Signed off',
            operator,
          })
          break
        case 'work_order_uncompleted':
          entries.push({
            id,
            at,
            kind: e.kind,
            title: 'Work order reopened',
            detail: 'Sign-off removed',
            operator,
          })
          break
        case 'operation_completed':
          entries.push({
            id,
            at,
            kind: e.kind,
            title: 'Operation completed',
            detail: prefix.replace(/ — $/, '') || 'Operation',
            operator,
          })
          break
        case 'operation_uncompleted':
          entries.push({
            id,
            at,
            kind: e.kind,
            title: 'Operation reopened',
            detail: prefix.replace(/ — $/, '') || 'Operation',
            operator,
          })
          break
        case 'input_changed':
          {
            const field = e.inputId ?? 'field'
            const valueKey = `${e.operationNo ?? 'na'}:${e.opId ?? 'na'}:${field}`
            const next = formatWorkOrderValue(e.value)
            const hadPrior = priorValues.has(valueKey)
            const prev = hadPrior ? formatWorkOrderValue(priorValues.get(valueKey)) : null
            priorValues.set(valueKey, e.value)
            entries.push({
              id,
              at,
              kind: e.kind,
              title: 'Input updated',
              detail: hadPrior
                ? `${prefix}${field}: ${prev} → ${next}`
                : `${prefix}${field}: ${next}`,
              operator,
            })
          }
          break
        case 'step_completed':
          if (e.inputs) {
            for (const [inputId, value] of Object.entries(e.inputs)) {
              const valueKey = `${e.operationNo ?? 'na'}:${e.opId ?? 'na'}:${inputId}`
              priorValues.set(valueKey, value)
            }
          }
          entries.push({
            id,
            at,
            kind: e.kind,
            title: 'Step completed',
            detail: `${prefix}${e.stepId ?? 'step'}`,
            operator,
          })
          break
        case 'step_uncompleted':
          entries.push({
            id,
            at,
            kind: e.kind,
            title: 'Step reopened',
            detail: `${prefix}${e.stepId ?? 'step'}`,
            operator,
          })
          break
        case 'step_note':
          entries.push({
            id,
            at,
            kind: e.kind,
            title: 'Note saved',
            detail: `${prefix}${String(e.note ?? '').trim() || e.stepId || 'step'}`,
            operator,
          })
          break
        case 'operation_added': {
          const name = e.operationName ?? e.opId ?? 'Operation'
          entries.push({
            id,
            at,
            kind: e.kind,
            title: 'Operation added',
            detail: `${e.operationNo}. ${name} (${e.opId ?? ''})`,
            operator,
          })
          break
        }
        case 'operation_removed': {
          const name = e.operationName ?? e.opId ?? 'Operation'
          entries.push({
            id,
            at,
            kind: e.kind,
            title: 'Operation removed',
            detail: `${e.operationNo}. ${name} (${e.opId ?? ''})`,
            operator,
          })
          break
        }
        default:
          break
      }
    })

  return entries.reverse()
}
