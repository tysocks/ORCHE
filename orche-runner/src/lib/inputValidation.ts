import { isCheckboxAnswered } from './checkboxInput'
import type { OrcheInput } from './types'

function isEmptyValue(def: OrcheInput, value: unknown): boolean {
  if (def.type === 'checkbox') {
    if (!def.required) return false
    return !isCheckboxAnswered(value)
  }
  if (def.type === 'number') return value === '' || value == null || Number.isNaN(Number(value))
  if (def.type === 'equipment') {
    if (!def.required) return false
    const o =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null
    const desc = String(o?.description ?? '').trim()
    return !desc
  }
  if (typeof value === 'string') return value.trim() === ''
  return value == null
}

export function stepInputsValid(
  inputs: OrcheInput[],
  values: Record<string, unknown>,
): boolean {
  for (const def of inputs) {
    if (!def.required) continue
    if (isEmptyValue(def, values[def.id])) return false
  }
  return true
}
