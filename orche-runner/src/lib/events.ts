import type { ProcessEvent } from './types'

function matchesOperation(e: ProcessEvent, operationNo: number, opId: string): boolean {
  if (e.operationNo != null) return e.operationNo === operationNo
  return e.opId === opId
}

function sortedByTime(events: ProcessEvent[]): ProcessEvent[] {
  return [...events].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
}

export type StepMeta = {
  completed: boolean
  completedBy?: string
  note: string
}

export function deriveStepMeta(
  events: ProcessEvent[],
  operationNo: number,
  opId: string,
): Record<string, StepMeta> {
  const meta: Record<string, StepMeta> = {}

  for (const e of sortedByTime(events)) {
    if (!matchesOperation(e, operationNo, opId) || !e.stepId) continue
    const id = e.stepId
    if (!meta[id]) meta[id] = { completed: false, note: '' }

    if (e.kind === 'step_completed') {
      meta[id].completed = true
      meta[id].completedBy =
        (e.completedBy as string | undefined) ??
        (e.operatorName as string | undefined) ??
        meta[id].completedBy
    }
    if (e.kind === 'step_uncompleted') {
      meta[id].completed = false
      meta[id].completedBy = undefined
    }
    if (e.kind === 'step_note') {
      meta[id].note = String(e.note ?? '')
    }
  }

  return meta
}

export function deriveInputValues(
  events: ProcessEvent[],
  operationNo: number,
  opId: string,
): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const e of sortedByTime(events)) {
    if (!matchesOperation(e, operationNo, opId)) continue
    if (e.kind === 'input_changed' && e.inputId) {
      values[e.inputId] = e.value
    }
    if (e.kind === 'step_completed' && e.inputs) {
      Object.assign(values, e.inputs)
    }
  }
  return values
}

export function deriveCompletedSteps(
  events: ProcessEvent[],
  operationNo: number,
  opId: string,
): Set<string> {
  const meta = deriveStepMeta(events, operationNo, opId)
  return new Set(Object.keys(meta).filter((id) => meta[id].completed))
}

export function deriveOperationStatus(
  events: ProcessEvent[],
  operationNo: number,
  opId: string,
): 'not_started' | 'in_progress' | 'completed' {
  let complete = false
  for (const e of sortedByTime(events)) {
    if (!matchesOperation(e, operationNo, opId)) continue
    if (e.kind === 'operation_completed') complete = true
    if (e.kind === 'operation_uncompleted') complete = false
  }
  if (complete) return 'completed'

  const completed = deriveCompletedSteps(events, operationNo, opId)
  const hasActivity = events.some(
    (e) =>
      matchesOperation(e, operationNo, opId) &&
      (e.kind === 'input_changed' ||
        e.kind === 'step_completed' ||
        e.kind === 'step_uncompleted' ||
        e.kind === 'step_note'),
  )
  if (hasActivity || completed.size > 0) return 'in_progress'
  return 'not_started'
}

export function deriveBlockedOps(
  operations: { operationNo: number; nextOperationNo: number | null }[],
  completedOpNos: Set<number>,
): Set<number> {
  const blocked = new Set<number>()
  for (const op of operations) {
    if (op.nextOperationNo == null) continue
    if (!completedOpNos.has(op.operationNo)) {
      blocked.add(op.nextOperationNo)
    }
  }
  return blocked
}
