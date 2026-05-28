import type { OrcheInput, ParsedOperation } from './types'

export type RequiredToolEntry = {
  description: string
  partNumber?: string
  equipmentId?: string
  source?: 'frontmatter' | 'step'
  stepLabel?: string
}

export function parseRequiredToolEntry(raw: unknown): RequiredToolEntry | null {
  if (typeof raw === 'string') {
    const description = raw.trim()
    return description ? { description, source: 'frontmatter' } : null
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const description = String(o.description ?? o.name ?? '').trim()
    if (!description) return null
    return {
      description,
      partNumber: String(o.part_number ?? o.partNumber ?? '').trim() || undefined,
      equipmentId: String(o.equipment_id ?? o.equipmentId ?? '').trim() || undefined,
      source: 'frontmatter',
    }
  }
  return null
}

export function parseRequiredToolsFromFrontmatter(raw: unknown): RequiredToolEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map(parseRequiredToolEntry).filter((t): t is RequiredToolEntry => t != null)
}

export function parseRequiredTools(raw: unknown): RequiredToolEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map(parseRequiredToolEntry).filter((t): t is RequiredToolEntry => t != null)
}

export function collectEquipmentFromInputs(
  inputs: OrcheInput[],
  values: Record<string, unknown>,
  stepLabel?: string,
): RequiredToolEntry[] {
  const out: RequiredToolEntry[] = []
  for (const def of inputs) {
    if (def.type !== 'equipment') continue
    const value = values[def.id]
    const recorded =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null
    const description =
      String(recorded?.description ?? def.label ?? '').trim() || def.label
    const partNumber =
      String(recorded?.part_number ?? def.part_number ?? '').trim() || undefined
    const equipmentId =
      String(recorded?.equipment_id ?? def.equipment_id ?? '').trim() || undefined
    if (!description && !partNumber && !equipmentId) continue
    out.push({
      description,
      partNumber,
      equipmentId,
      source: 'step',
      stepLabel,
    })
  }
  return out
}

export function collectToolsForOperation(
  operation: ParsedOperation,
  values: Record<string, unknown>,
): RequiredToolEntry[] {
  const fromFm = parseRequiredTools(operation.requiredTools)
  const fromSteps: RequiredToolEntry[] = []

  for (const step of operation.steps) {
    fromSteps.push(...collectEquipmentFromInputs(step.inputs, values, step.title))
  }
  if (operation.checklistSections) {
    for (const section of operation.checklistSections) {
      for (const item of section.items) {
        fromSteps.push(
          ...collectEquipmentFromInputs(item.inputs, values, `${item.number} ${item.title}`),
        )
      }
    }
  }

  return [...fromFm, ...fromSteps]
}

export function mergeToolEntries(entries: RequiredToolEntry[]): RequiredToolEntry[] {
  const seen = new Set<string>()
  const out: RequiredToolEntry[] = []
  for (const e of entries) {
    const key = `${e.description}|${e.partNumber ?? ''}|${e.equipmentId ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}
