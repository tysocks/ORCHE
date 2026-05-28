import { stepInputsValid } from './inputValidation'
import type { ChecklistSection, OrcheInput } from './types'

export function sectionAllInputs(section: ChecklistSection): OrcheInput[] {
  return section.items.flatMap((item) => item.inputs)
}

export function sectionCanComplete(
  section: ChecklistSection,
  values: Record<string, unknown>,
): boolean {
  if (section.items.length === 0) return true
  return section.items.every((item) => stepInputsValid(item.inputs, values))
}

export function itemInputsReady(item: { inputs: OrcheInput[] }, values: Record<string, unknown>): boolean {
  if (item.inputs.length === 0) return true
  return stepInputsValid(item.inputs, values)
}

export function buildSectionInputSnapshot(
  section: ChecklistSection,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {}
  for (const def of sectionAllInputs(section)) {
    snapshot[def.id] = values[def.id]
  }
  return snapshot
}
